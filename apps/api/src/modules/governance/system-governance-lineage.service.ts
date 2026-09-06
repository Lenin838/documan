/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { DocumentationBaseline, IDocumentationBaseline } from './documentation-baseline.model.js';
import { PackageFulfillmentAttestation, IPackageFulfillmentAttestation } from '../change-packages/change-package-attestation.model.js';
import {
  SystemGovernanceWaiver,
  SystemGovernanceWaiverDocument,
  SystemBlockerType,
} from './system-governance-waiver.model.js';
import {
  evaluateSystemGateFromState,
  matchWaiverForDependency,
} from './system-topology-governance-gate.service.js';
import type {
  SystemGovernanceGateResult,
  SystemReleaseStatus,
  BlockingDependencyDTO,
} from './system-topology-governance-gate.types.js';
import type {
  HistoricalSystemGateResult,
  SystemGovernanceTimelineResult,
  SystemGovernanceStateDiff,
  TimelineEntry,
  TimelineEventType,
  CausalityClassification,
  HistoricalReconstructionCompleteness,
} from './system-governance-lineage.types.js';

function validateObjectId(id: string, errorMessage = 'Invalid project ID', code = 'PROJECT_NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

/**
 * Reconstructs point-in-time system release gate status at timestamp T.
 * Respects strict reconstructability boundaries and ACL isolation.
 */
export async function evaluateSystemGateAt(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  targetTimestampInput: Date | string,
): Promise<HistoricalSystemGateResult> {
  validateObjectId(projectId);

  const targetTimestamp = new Date(targetTimestampInput);
  if (isNaN(targetTimestamp.getTime())) {
    throw new AppError('Invalid timestamp format for historical evaluation', 400, 'INVALID_TIMESTAMP');
  }

  const projObjId = new Types.ObjectId(projectId);
  const rootProject = await Project.findOne({ _id: projObjId });
  if (!rootProject) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // Evaluate if project existed at T
  if (rootProject.createdAt > targetTimestamp) {
    return {
      rootProjectId: projectId,
      evaluatedAtTimestamp: targetTimestamp.toISOString(),
      reconstructionCompleteness: 'INDETERMINATE_HISTORICAL_EVIDENCE',
      completenessReason: `Project "${rootProject.name}" did not exist at timestamp ${targetTimestamp.toISOString()}`,
      systemReleaseStatus: 'INDETERMINATE',
      passed: false,
      subsystems: {
        rootLocalGate: { passed: false, status: 'INDETERMINATE' },
        baselineAlignment: { alignmentScore: null, evidenceCompleteness: null, alignmentState: 'INDETERMINATE' },
        providerAttestationSummary: { totalAttestations: 0, staleAttestations: 0, missingAttestations: 0 },
        blockingDependencies: [],
      },
    };
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, projectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  let reconstructionCompleteness: HistoricalReconstructionCompleteness = 'COMPLETE';
  let completenessReason: string | undefined = undefined;

  // 1. Reconstruct Topology at T
  const topologyLinksAtT = await ProjectTopologyLink.find({
    sourceProjectId: projObjId,
    type: 'DEPENDS_ON',
    createdAt: { $lte: targetTimestamp },
  }).populate<{ targetProjectId: InstanceType<typeof Project> }>({
    path: 'targetProjectId',
    select: '_id name isArchived createdAt ownerId',
  });

  const authorizedProjectIds = new Set<string>([projObjId.toString()]);
  const providerProjectsMap = new Map<string, { id: string; name: string }>();

  for (const link of topologyLinksAtT) {
    if (!link.targetProjectId) continue;
    const tgtId = link.targetProjectId._id.toString();

    // Skip if target project did not exist at T
    if (link.targetProjectId.createdAt > targetTimestamp) continue;

    const canReadTgt = await checkUserProjectReadAccess(userId, role, tgtId);
    if (!canReadTgt) continue;

    authorizedProjectIds.add(tgtId);
    providerProjectsMap.set(tgtId, { id: tgtId, name: link.targetProjectId.name });
  }

  // 2. Reconstruct Active Waivers at T
  const waiversAtT = (await SystemGovernanceWaiver.find({
    rootProjectId: projObjId,
    createdAt: { $lte: targetTimestamp },
    expiresAt: { $gt: targetTimestamp },
    $or: [{ isRevoked: false }, { revokedAt: { $gt: targetTimestamp } }],
  }).lean()) as SystemGovernanceWaiverDocument[];

  // 3. Reconstruct Active Baselines at T for each authorized project
  const baselinesAtT = new Map<string, IDocumentationBaseline>();
  for (const projId of authorizedProjectIds) {
    const baseline = await DocumentationBaseline.findOne({
      projectId: new Types.ObjectId(projId),
      createdAt: { $lte: targetTimestamp },
      $or: [{ archivedAt: null }, { archivedAt: { $gt: targetTimestamp } }],
    }).sort({ createdAt: -1 });

    if (baseline) {
      baselinesAtT.set(projId, baseline);
    }
  }

  // 4. Reconstruct Attestations at T for each project
  const attestationsAtT = new Map<string, IPackageFulfillmentAttestation>();
  for (const projId of authorizedProjectIds) {
    const attestation = await PackageFulfillmentAttestation.findOne({
      projectId: new Types.ObjectId(projId),
      createdAt: { $lte: targetTimestamp },
    }).sort({ createdAt: -1 });

    if (attestation) {
      attestationsAtT.set(projId, attestation);
    }
  }

  // 5. Evaluate System Gate using Phase 19 Gate Evaluator
  const blockingDependencies: BlockingDependencyDTO[] = [];
  const appliedWaiverIdsSet = new Set<string>();
  let waivedBlockersCount = 0;
  let unwaivedBlockersCount = 0;
  let blockedProvidersCount = 0;

  const rootBaseline = baselinesAtT.get(projObjId.toString());

  // Evaluate Root Local Gate at T
  const isRootLocalGateBlocked = !rootBaseline;
  if (isRootLocalGateBlocked) {
    reconstructionCompleteness = 'INDETERMINATE_HISTORICAL_EVIDENCE';
    completenessReason = `Root project "${rootProject.name}" lacked an active DocumentationBaseline at timestamp ${targetTimestamp.toISOString()}`;
  }

  let totalAttestations = 0;
  let staleAttestations = 0;
  let missingAttestations = 0;

  // Evaluate Provider Blockers against reconstructed state at T
  for (const [providerId, providerMeta] of providerProjectsMap.entries()) {
    const providerBaseline = baselinesAtT.get(providerId);
    const providerAttestation = attestationsAtT.get(providerId);

    const isMissingBaseline = !providerBaseline;
    const isUnattested = Boolean(providerBaseline && !providerAttestation);
    
    let isStale = false;
    if (providerBaseline && providerAttestation) {
      totalAttestations++;
      if (providerBaseline.createdAt > providerAttestation.createdAt) {
        isStale = true;
        staleAttestations++;
      }
    } else if (isUnattested) {
      missingAttestations++;
    }

    if (isMissingBaseline || isUnattested || isStale) {
      let blockerType: SystemBlockerType = 'CONTRACT_MISALIGNED';
      let rawReason = '';

      if (isMissingBaseline) {
        blockerType = 'CONTRACT_MISALIGNED';
        rawReason = `MISALIGNED: Provider project "${providerMeta.name}" lacked active baseline at evaluation timestamp`;
      } else if (isUnattested) {
        blockerType = 'PROVIDER_ATTESTATION_MISSING';
        rawReason = `UNATTESTED: Provider project "${providerMeta.name}" active baseline lacks fulfillment attestation`;
      } else if (isStale) {
        blockerType = 'PROVIDER_ATTESTATION_STALE';
        rawReason = `STALE_ATTESTATION: Provider project "${providerMeta.name}" baseline v${providerBaseline!.versionTag} was updated after attestation`;
      }

      const matchedWaiver = matchWaiverForDependency(
        blockerType,
        providerId,
        null,
        null,
        waiversAtT,
      );

      const isWaived = Boolean(matchedWaiver);
      const appliedWaiverId: string | null = matchedWaiver ? String((matchedWaiver as any)._id) : null;

      if (isWaived && appliedWaiverId) {
        waivedBlockersCount++;
        appliedWaiverIdsSet.add(appliedWaiverId);
      } else {
        unwaivedBlockersCount++;
        blockedProvidersCount++;
      }

      blockingDependencies.push({
        providerProjectId: providerId,
        providerProjectName: providerMeta.name,
        consumerDocumentTitle: 'Root System Contract',
        providerDocumentTitle: providerBaseline ? `Baseline v${providerBaseline.versionTag}` : 'No Baseline',
        targetDocumentId: null,
        contractVersionNumber: null,
        blockerType,
        reason: isWaived
          ? `[WAIVED] ${rawReason} (Waiver Reason: ${matchedWaiver!.reason})`
          : rawReason,
        isWaived,
        appliedWaiverId,
        governanceEvidence: {
          providerBaselinePresent: Boolean(providerBaseline),
          consumerBaselinePresent: Boolean(rootBaseline),
          providerAttested: Boolean(providerAttestation),
          attestationStale: isStale,
          providerGovernanceEnabled: true,
          providerLocalGateStatus: providerBaseline ? 'PASSED' : 'BLOCKED',
        },
      });
    }
  }

  const precedenceInput = {
    isRootLocalGateBlocked,
    rootLocalGateResult: {
      status: (isRootLocalGateBlocked ? 'BLOCKED' : 'PASSED') as 'PASSED' | 'BLOCKED' | 'GOVERNANCE_DISABLED',
      freshnessPercentage: rootBaseline ? 100 : 0,
      blockingDocuments: [],
    },
    rootProjectId: projObjId.toString(),
    rootProjectName: rootProject.name,
    evaluationTimestamp: targetTimestamp,
    isTruncated: false,
    alignmentResult: {
      aggregateState: (unwaivedBlockersCount > 0 ? 'MISALIGNED' : 'ALIGNED') as any,
      alignmentScore: unwaivedBlockersCount > 0 ? 50 : 100,
      evidenceCompleteness: 100,
      summary: {
        totalUnits: providerProjectsMap.size,
        alignedUnits: providerProjectsMap.size - blockingDependencies.length,
        misalignedUnits: blockingDependencies.length,
        indeterminateUnits: 0,
      },
    },
    blockedProvidersCount,
    waivedBlockersCount,
    unwaivedBlockersCount,
    appliedWaiverIdsSet,
    blockingDependencies,
  };

  const gateResult: SystemGovernanceGateResult = evaluateSystemGateFromState(precedenceInput);

  return {
    rootProjectId: projectId,
    evaluatedAtTimestamp: targetTimestamp.toISOString(),
    reconstructionCompleteness,
    completenessReason: completenessReason || null,
    systemReleaseStatus: gateResult.systemReleaseStatus,
    passed: gateResult.passed,
    subsystems: {
      rootLocalGate: {
        passed: !isRootLocalGateBlocked,
        status: isRootLocalGateBlocked ? 'BLOCKED' : 'PASSED',
      },
      baselineAlignment: {
        alignmentScore: gateResult.evidence.baselineAlignment.alignmentScore,
        evidenceCompleteness: gateResult.evidence.baselineAlignment.evidenceCompleteness,
        alignmentState: gateResult.evidence.baselineAlignment.aggregateState,
      },
      providerAttestationSummary: {
        totalAttestations,
        staleAttestations,
        missingAttestations,
      },
      blockingDependencies: gateResult.evidence.blockingDependencies.map((b) => ({
        providerProjectId: b.providerProjectId,
        providerProjectName: b.providerProjectName,
        blockerType: b.blockerType,
        reason: b.reason,
        isWaived: b.isWaived,
        waiverId: b.appliedWaiverId ?? null,
      })),
    },
  };
}

/**
 * Generates an ordered chronological timeline of governance events and gate transitions over a time window [from, to].
 */
export async function generateSystemGovernanceTimeline(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  fromDateInput?: Date | string,
  toDateInput?: Date | string,
  limit: number = 50,
): Promise<SystemGovernanceTimelineResult> {
  validateObjectId(projectId);

  const windowEnd = toDateInput ? new Date(toDateInput) : new Date();
  const windowStart = fromDateInput
    ? new Date(fromDateInput)
    : new Date(windowEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (isNaN(windowStart.getTime()) || isNaN(windowEnd.getTime())) {
    throw new AppError('Invalid time window format', 400, 'INVALID_TIME_WINDOW');
  }

  if (windowStart > windowEnd) {
    throw new AppError('Start timestamp cannot be after end timestamp', 400, 'INVALID_TIME_WINDOW');
  }

  const maxRangeMs = 90 * 24 * 60 * 60 * 1000;
  if (windowEnd.getTime() - windowStart.getTime() > maxRangeMs) {
    throw new AppError('Timeline window cannot exceed 90 days', 400, 'TIME_WINDOW_EXCEEDED');
  }

  const boundedLimit = Math.min(Math.max(1, limit), 100);

  const projObjId = new Types.ObjectId(projectId);
  const rootProject = await Project.findOne({ _id: projObjId });
  if (!rootProject) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, projectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  const topologyLinks = await ProjectTopologyLink.find({
    sourceProjectId: projObjId,
    type: 'DEPENDS_ON',
  });

  const authorizedProjectIds = new Set<string>([projObjId.toString()]);
  const projectNamesMap = new Map<string, string>([[projObjId.toString(), rootProject.name]]);

  for (const link of topologyLinks) {
    const tgtId = link.targetProjectId.toString();
    const canRead = await checkUserProjectReadAccess(userId, role, tgtId);
    if (canRead) {
      authorizedProjectIds.add(tgtId);
      const tgtProj = await Project.findById(tgtId).select('name');
      if (tgtProj) {
        projectNamesMap.set(tgtId, tgtProj.name);
      }
    }
  }

  const authorizedObjIds = Array.from(authorizedProjectIds).map((id) => new Types.ObjectId(id));

  const rawEvents: Array<{
    timestamp: Date;
    eventType: TimelineEventType;
    sourceEntityId: string;
    sourceEntityType: 'DocumentationBaseline' | 'PackageFulfillmentAttestation' | 'SystemGovernanceWaiver' | 'ProjectTopologyLink';
    projectId: string;
    summary: string;
    attestationPackageId?: string;
  }> = [];

  // 1. Baselines
  const baselines = await DocumentationBaseline.find({
    projectId: { $in: authorizedObjIds },
    createdAt: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  for (const b of baselines) {
    rawEvents.push({
      timestamp: new Date(b.createdAt),
      eventType: 'BASELINE_CREATED',
      sourceEntityId: b._id.toString(),
      sourceEntityType: 'DocumentationBaseline',
      projectId: b.projectId.toString(),
      summary: `Baseline v${b.versionTag} created for project "${projectNamesMap.get(b.projectId.toString()) || 'Project'}"`,
    });
  }

  // 2. Attestations
  const attestations = await PackageFulfillmentAttestation.find({
    projectId: { $in: authorizedObjIds },
    createdAt: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  for (const a of attestations) {
    rawEvents.push({
      timestamp: new Date(a.createdAt),
      eventType: 'ATTESTATION_FULFILLED',
      sourceEntityId: a._id.toString(),
      sourceEntityType: 'PackageFulfillmentAttestation',
      projectId: a.projectId.toString(),
      summary: `Change package attestation v${a.attestationVersion} fulfilled for project "${projectNamesMap.get(a.projectId.toString()) || 'Project'}"`,
      attestationPackageId: a.changePackageId.toString(),
    });
  }

  // 3. Waivers
  const waivers = await SystemGovernanceWaiver.find({
    rootProjectId: projObjId,
    createdAt: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  for (const w of waivers) {
    rawEvents.push({
      timestamp: new Date(w.createdAt),
      eventType: 'WAIVER_GRANTED',
      sourceEntityId: w._id.toString(),
      sourceEntityType: 'SystemGovernanceWaiver',
      projectId: w.rootProjectId.toString(),
      summary: `System governance waiver granted for blocker "${w.blockerType}" on provider "${projectNamesMap.get(w.targetProviderProjectId.toString()) || 'Provider'}"`,
    });

    if (w.isRevoked && w.revokedAt && w.revokedAt >= windowStart && w.revokedAt <= windowEnd) {
      rawEvents.push({
        timestamp: new Date(w.revokedAt),
        eventType: 'WAIVER_REVOKED',
        sourceEntityId: w._id.toString(),
        sourceEntityType: 'SystemGovernanceWaiver',
        projectId: w.rootProjectId.toString(),
        summary: `System governance waiver revoked for blocker "${w.blockerType}"`,
      });
    }

    if (w.expiresAt && w.expiresAt >= windowStart && w.expiresAt <= windowEnd) {
      rawEvents.push({
        timestamp: new Date(w.expiresAt),
        eventType: 'WAIVER_EXPIRED',
        sourceEntityId: w._id.toString(),
        sourceEntityType: 'SystemGovernanceWaiver',
        projectId: w.rootProjectId.toString(),
        summary: `System governance waiver expired for blocker "${w.blockerType}"`,
      });
    }
  }

  // 4. Topology Links
  const links = await ProjectTopologyLink.find({
    sourceProjectId: projObjId,
    createdAt: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  for (const l of links) {
    rawEvents.push({
      timestamp: new Date(l.createdAt),
      eventType: 'TOPOLOGY_LINK_CREATED',
      sourceEntityId: l._id.toString(),
      sourceEntityType: 'ProjectTopologyLink',
      projectId: l.sourceProjectId.toString(),
      summary: `Topology DEPENDS_ON link created to provider project "${projectNamesMap.get(l.targetProjectId.toString()) || 'Provider'}"`,
    });
  }

  const eventRank: Record<TimelineEventType, number> = {
    BASELINE_CREATED: 1,
    ATTESTATION_FULFILLED: 2,
    WAIVER_GRANTED: 3,
    WAIVER_REVOKED: 4,
    WAIVER_EXPIRED: 5,
    TOPOLOGY_LINK_CREATED: 6,
  };

  rawEvents.sort((a, b) => {
    const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
    if (timeDiff !== 0) return timeDiff;
    const rankDiff = eventRank[a.eventType] - eventRank[b.eventType];
    if (rankDiff !== 0) return rankDiff;
    return a.sourceEntityId.localeCompare(b.sourceEntityId);
  });

  const totalEntries = rawEvents.length;
  const slicedEvents = rawEvents.slice(0, boundedLimit);
  const hasMore = totalEntries > boundedLimit;

  const entries: TimelineEntry[] = [];
  let previousGateStatus: SystemReleaseStatus = 'PASSED';

  for (let i = 0; i < slicedEvents.length; i++) {
    const ev = slicedEvents[i]!;
    
    const evalResult = await evaluateSystemGateAt(userId, role, projectId, ev.timestamp);
    const newStatus = evalResult.systemReleaseStatus;
    const gateStateChanged = i === 0 ? false : newStatus !== previousGateStatus;

    let causalityClassification: CausalityClassification = 'OBSERVED_EVENT';

    if (ev.eventType === 'ATTESTATION_FULFILLED' && ev.attestationPackageId) {
      causalityClassification = 'PROVEN_CAUSALITY';
    } else if (gateStateChanged) {
      causalityClassification = 'ASSOCIATED_EVENT';
    }

    const deterministicEntryId = `${ev.timestamp.getTime()}:${ev.sourceEntityId}:${ev.eventType}`;

    entries.push({
      entryId: deterministicEntryId,
      timestamp: ev.timestamp.toISOString(),
      eventType: ev.eventType,
      sourceEntityId: ev.sourceEntityId,
      sourceEntityType: ev.sourceEntityType,
      projectId: ev.projectId,
      projectName: projectNamesMap.get(ev.projectId) || 'Project',
      summary: ev.summary,
      causalityClassification,
      derivedTransition: {
        previousStatus: previousGateStatus,
        newStatus,
        gateStateChanged,
      },
    });

    previousGateStatus = newStatus;
  }

  return {
    rootProjectId: projectId,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    reconstructionCompleteness: 'COMPLETE',
    totalEntries,
    entries,
    hasMore,
  };
}

/**
 * Computes fine-grained gate state diffs between two historical timestamps T1 and T2.
 */
export async function calculateGovernanceStateDiff(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  t1Input: Date | string,
  t2Input: Date | string,
): Promise<SystemGovernanceStateDiff> {
  const t1 = new Date(t1Input);
  const t2 = new Date(t2Input);

  if (isNaN(t1.getTime()) || isNaN(t2.getTime())) {
    throw new AppError('Invalid timestamp format for state diff calculation', 400, 'INVALID_TIMESTAMP');
  }

  if (t1 > t2) {
    throw new AppError('Timestamp T1 cannot be after timestamp T2', 400, 'INVALID_TIMESTAMP');
  }

  const gateResultT1 = await evaluateSystemGateAt(userId, role, projectId, t1);
  const gateResultT2 = await evaluateSystemGateAt(userId, role, projectId, t2);

  const gateStateChanged = gateResultT1.systemReleaseStatus !== gateResultT2.systemReleaseStatus;

  const blockersT1Map = new Map(
    gateResultT1.subsystems.blockingDependencies.map((b) => [`${b.providerProjectId}:${b.blockerType}`, b]),
  );

  const blockersT2Map = new Map(
    gateResultT2.subsystems.blockingDependencies.map((b) => [`${b.providerProjectId}:${b.blockerType}`, b]),
  );

  const newlyBlockedDependencies: SystemGovernanceStateDiff['newlyBlockedDependencies'] = [];
  const newlyResolvedDependencies: SystemGovernanceStateDiff['newlyResolvedDependencies'] = [];
  const unaffectedDependencies: SystemGovernanceStateDiff['unaffectedDependencies'] = [];

  for (const [key, b2] of blockersT2Map.entries()) {
    if (!blockersT1Map.has(key)) {
      newlyBlockedDependencies.push({
        providerProjectId: b2.providerProjectId,
        providerProjectName: b2.providerProjectName,
        blockerType: b2.blockerType,
        reason: b2.reason,
      });
    } else {
      unaffectedDependencies.push({
        providerProjectId: b2.providerProjectId,
        providerProjectName: b2.providerProjectName,
        blockerType: b2.blockerType,
        reason: b2.reason,
      });
    }
  }

  for (const [key, b1] of blockersT1Map.entries()) {
    if (!blockersT2Map.has(key)) {
      newlyResolvedDependencies.push({
        providerProjectId: b1.providerProjectId,
        providerProjectName: b1.providerProjectName,
        blockerType: b1.blockerType,
        reason: b1.reason,
      });
    }
  }

  const combinedCompleteness =
    gateResultT1.reconstructionCompleteness === 'INDETERMINATE_HISTORICAL_EVIDENCE' ||
    gateResultT2.reconstructionCompleteness === 'INDETERMINATE_HISTORICAL_EVIDENCE'
      ? 'INDETERMINATE_HISTORICAL_EVIDENCE'
      : 'COMPLETE';

  return {
    rootProjectId: projectId,
    t1: t1.toISOString(),
    t2: t2.toISOString(),
    reconstructionCompleteness: combinedCompleteness,
    completenessReason:
      gateResultT1.completenessReason || gateResultT2.completenessReason || null,
    gateStateChanged,
    previousSystemReleaseStatus: gateResultT1.systemReleaseStatus,
    newSystemReleaseStatus: gateResultT2.systemReleaseStatus,
    newlyBlockedDependencies,
    newlyResolvedDependencies,
    unaffectedDependencies,
  };
}
