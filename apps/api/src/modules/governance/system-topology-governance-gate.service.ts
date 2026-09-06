import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { evaluateReleaseGateInternal, BlockingDocumentInfo } from './release-gate-evaluator.service.js';
import { calculateSystemBaselineAlignment } from './system-baseline-alignment.service.js';
import {
  SystemGovernanceWaiver,
  SystemBlockerType,
  ISystemGovernanceWaiver,
} from './system-governance-waiver.model.js';
import type {
  SystemGovernanceGateResult,
  SystemReleaseStatus,
  BlockingDependencyDTO,
} from './system-topology-governance-gate.types.js';

function validateObjectId(id: string, errorMessage = 'Invalid project ID', code = 'PROJECT_NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export function matchWaiverForDependency(
  blockerType: SystemBlockerType,
  providerProjectId: string,
  targetDocumentId?: string | null,
  consumerContractVersion?: number | null,
  activeWaivers: ISystemGovernanceWaiver[] = [],
): ISystemGovernanceWaiver | undefined {
  return activeWaivers.find((w) => {
    // 1. Blocker Type must match exactly
    if (w.blockerType !== blockerType) return false;

    // 2. Target Provider Project ID must match exactly
    if (w.targetProviderProjectId.toString() !== providerProjectId) return false;

    // 3. Target Document ID Handling
    if (w.targetDocumentId) {
      if (!targetDocumentId || w.targetDocumentId.toString() !== targetDocumentId.toString()) {
        return false;
      }
    } else if (blockerType === 'PROVIDER_LOCAL_GATE_BLOCKED') {
      // PROVIDER_LOCAL_GATE_BLOCKED requires exact document match. A wildcard waiver never matches.
      return false;
    }

    // 4. Contract Version Binding Handling
    if (w.contractVersionNumber !== null && w.contractVersionNumber !== undefined) {
      if (
        consumerContractVersion === undefined ||
        consumerContractVersion === null ||
        w.contractVersionNumber !== consumerContractVersion
      ) {
        return false;
      }
    }

    return true;
  });
}

export async function evaluateSystemTopologyGovernanceGate(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
): Promise<SystemGovernanceGateResult> {
  validateObjectId(projectId);

  const projObjId = new Types.ObjectId(projectId);
  const rootProject = await Project.findOne({ _id: projObjId, isArchived: false });
  if (!rootProject) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, projectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  // SINGLE EVALUATION TIMESTAMP ESTABLISHED ONCE AT ENTRY
  const evaluationTimestamp = new Date();

  // STAGE A: Batch Candidate Retrieval for Active Waivers
  const activeWaivers = (await SystemGovernanceWaiver.find({
    rootProjectId: projObjId,
    scopeState: 'ACTIVE',
    isRevoked: false,
    expiresAt: { $gt: evaluationTimestamp },
  }).lean()) as ISystemGovernanceWaiver[];

  // PRECEDENCE STEP 1: Root Project Governance Disabled
  if (rootProject.governanceSettings?.isGovernanceEnabled === false) {
    const rootGateDisabledResult = await evaluateReleaseGateInternal(projObjId);
    return {
      passed: false,
      systemReleaseStatus: 'GOVERNANCE_DISABLED',
      rootProjectId: projObjId.toString(),
      evaluatedAt: evaluationTimestamp,
      summary: {
        totalDependencies: 0,
        alignedDependencies: 0,
        misalignedDependencies: 0,
        indeterminateDependencies: 0,
        blockedProviders: 0,
        waivedBlockers: 0,
        unwaivedBlockers: 0,
      },
      evidence: {
        rootLocalGate: {
          status: 'GOVERNANCE_DISABLED',
          freshnessPercentage: rootGateDisabledResult.freshnessPercentage,
        },
        baselineAlignment: {
          aggregateState: 'ZERO_APPLICABLE_EVIDENCE',
          alignmentScore: null,
          evidenceCompleteness: null,
        },
        appliedWaiverIds: [],
        blockingDependencies: [],
      },
    };
  }

  // PRECEDENCE STEP 2: Root Local Phase 10 Gate Check
  const rootLocalGateResult = await evaluateReleaseGateInternal(projObjId);
  const isRootLocalGateBlocked = !rootLocalGateResult.passed || rootLocalGateResult.status === 'BLOCKED';

  // Traversal and Topology Truncation Check
  const MAX_DEPTH = 3;
  const MAX_NODES = 50;

  const queue: Array<{ id: string; depth: number }> = [{ id: projObjId.toString(), depth: 1 }];
  const visitedProjectIds = new Set<string>([projObjId.toString()]);
  const authorizedProjectIds = new Set<string>([projObjId.toString()]);
  let isTruncated = false;

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.depth >= MAX_DEPTH || authorizedProjectIds.size >= MAX_NODES) {
      const currentObjId = new Types.ObjectId(current.id);
      const unvisitedOutgoingCount = await ProjectTopologyLink.countDocuments({
        sourceProjectId: currentObjId,
        type: 'DEPENDS_ON',
      });
      if (unvisitedOutgoingCount > 0) {
        isTruncated = true;
      }
      continue;
    }

    const currentObjId = new Types.ObjectId(current.id);
    const topologyLinks = await ProjectTopologyLink.find({
      sourceProjectId: currentObjId,
      type: 'DEPENDS_ON',
    }).populate<{ targetProjectId: InstanceType<typeof Project> }>({
      path: 'targetProjectId',
      select: '_id name isArchived ownerId',
    });

    for (const link of topologyLinks) {
      if (!link.targetProjectId || link.targetProjectId.isArchived) continue;
      const tgtId = link.targetProjectId._id.toString();

      const canReadTgt = await checkUserProjectReadAccess(userId, role, tgtId);
      if (!canReadTgt) continue;

      if (!authorizedProjectIds.has(tgtId)) {
        if (authorizedProjectIds.size < MAX_NODES) {
          authorizedProjectIds.add(tgtId);
        } else {
          isTruncated = true;
          continue;
        }
      }

      if (!visitedProjectIds.has(tgtId)) {
        visitedProjectIds.add(tgtId);
        queue.push({ id: tgtId, depth: current.depth + 1 });
      }
    }
  }

  // Phase 18 System Baseline Alignment Calculation
  const alignmentResult = await calculateSystemBaselineAlignment(userId, role, projectId);

  // Evaluate Provider Local Gates
  const providerGateMap = new Map<
    string,
    { passed: boolean; status: string; freshnessPercentage: number; blockingDocuments: BlockingDocumentInfo[] }
  >();
  let blockedProvidersCount = 0;

  for (const providerId of authorizedProjectIds) {
    if (providerId === projObjId.toString()) continue;

    const providerObjId = new Types.ObjectId(providerId);
    const providerProject = await Project.findOne({ _id: providerObjId, isArchived: false });
    if (!providerProject) continue;

    const providerGate = await evaluateReleaseGateInternal(providerObjId);
    providerGateMap.set(providerId, {
      passed: providerGate.passed,
      status: providerGate.status,
      freshnessPercentage: providerGate.freshnessPercentage,
      blockingDocuments: providerGate.blockingDocuments || [],
    });

    if (!providerGate.passed || providerGate.status === 'BLOCKED') {
      blockedProvidersCount += 1;
    }
  }

  // STAGE B: Map Alignment Units and Evaluate Blockers Against Active Waivers
  const blockingDependencies: BlockingDependencyDTO[] = [];
  const appliedWaiverIdsSet = new Set<string>();
  let waivedBlockersCount = 0;
  let unwaivedBlockersCount = 0;

  for (const unit of alignmentResult.alignmentUnits) {
    const providerId = unit.providerProject.id;
    const providerGate = providerGateMap.get(providerId);
    const providerLocalGateStatus = providerGate ? providerGate.status : 'UNKNOWN';

    const isMisaligned = unit.alignmentState === 'MISALIGNED';
    const isUnattested = unit.governanceEvidence.providerBaselinePresent && !unit.governanceEvidence.providerAttested;
    const isAttestationStale = unit.governanceEvidence.attestationStale;
    const isProviderBlocked = providerGate ? (!providerGate.passed || providerGate.status === 'BLOCKED') : false;

    if (isMisaligned || isUnattested || isAttestationStale || isProviderBlocked) {
      let blockerType: SystemBlockerType;
      let rawReason: string;
      let targetDocumentId: string | null;
      const contractVersionNumber = unit.consumerVersionRef?.versionNumber ?? null;

      if (isMisaligned) {
        blockerType = 'CONTRACT_MISALIGNED';
        rawReason = `MISALIGNED: Consumer baseline snapshot references version v${unit.consumerVersionRef?.versionNumber ?? 'unknown'}, but Provider active baseline is v${unit.providerActiveVersion?.versionNumber ?? 'unknown'}`;
      } else if (isUnattested) {
        blockerType = 'PROVIDER_ATTESTATION_MISSING';
        rawReason = `UNATTESTED: Provider active baseline snapshot lacks required Phase 17 fulfillment attestation`;
      } else if (isAttestationStale) {
        blockerType = 'PROVIDER_ATTESTATION_STALE';
        rawReason = `STALE_ATTESTATION: Provider document head version has drifted beyond attested snapshot version`;
      } else {
        blockerType = 'PROVIDER_LOCAL_GATE_BLOCKED';
        rawReason = `PROVIDER_GATE_BLOCKED: Upstream provider project "${unit.providerProject.name}" has failing local document freshness or unreviewed drift`;
      }

      // If provider local gate is blocked, process granular blocking documents if present
      if (blockerType === 'PROVIDER_LOCAL_GATE_BLOCKED' && providerGate && providerGate.blockingDocuments.length > 0) {
        for (const blockDoc of providerGate.blockingDocuments) {
          const docTargetId = blockDoc.id;
          const matchedWaiver = matchWaiverForDependency(
            'PROVIDER_LOCAL_GATE_BLOCKED',
            providerId,
            docTargetId,
            contractVersionNumber,
            activeWaivers,
          );

          const isWaived = Boolean(matchedWaiver);
          const appliedWaiverId = matchedWaiver ? String((matchedWaiver as unknown as { _id: unknown })._id) : null;

          if (isWaived && appliedWaiverId) {
            waivedBlockersCount++;
            appliedWaiverIdsSet.add(appliedWaiverId);
          } else {
            unwaivedBlockersCount++;
          }

          blockingDependencies.push({
            providerProjectId: unit.providerProject.id,
            providerProjectName: unit.providerProject.name,
            consumerDocumentTitle: unit.consumerDocument.title,
            providerDocumentTitle: blockDoc.title,
            targetDocumentId: docTargetId,
            contractVersionNumber,
            blockerType: 'PROVIDER_LOCAL_GATE_BLOCKED',
            reason: isWaived
              ? `[WAIVED] ${rawReason} (${blockDoc.title}: ${blockDoc.reason}) (Waiver Reason: ${matchedWaiver!.reason})`
              : `${rawReason} (${blockDoc.title}: ${blockDoc.reason})`,
            isWaived,
            appliedWaiverId,
            governanceEvidence: {
              providerBaselinePresent: unit.governanceEvidence.providerBaselinePresent,
              consumerBaselinePresent: unit.governanceEvidence.consumerBaselinePresent,
              providerAttested: unit.governanceEvidence.providerAttested,
              attestationStale: unit.governanceEvidence.attestationStale,
              providerGovernanceEnabled: providerGate ? providerGate.status !== 'GOVERNANCE_DISABLED' : true,
              providerLocalGateStatus,
            },
          });
        }
      } else {
        // Non-local-gate blockers or provider local gate without granular docs
        targetDocumentId = unit.providerDocument?.id ?? null;
        const matchedWaiver = matchWaiverForDependency(
          blockerType,
          providerId,
          targetDocumentId,
          contractVersionNumber,
          activeWaivers,
        );

        const isWaived = Boolean(matchedWaiver);
        const appliedWaiverId = matchedWaiver ? String((matchedWaiver as unknown as { _id: unknown })._id) : null;

        if (isWaived && appliedWaiverId) {
          waivedBlockersCount++;
          appliedWaiverIdsSet.add(appliedWaiverId);
        } else {
          unwaivedBlockersCount++;
        }

        blockingDependencies.push({
          providerProjectId: unit.providerProject.id,
          providerProjectName: unit.providerProject.name,
          consumerDocumentTitle: unit.consumerDocument.title,
          providerDocumentTitle: unit.providerDocument.title,
          targetDocumentId,
          contractVersionNumber,
          blockerType,
          reason: isWaived
            ? `[WAIVED] ${rawReason} (Waiver Reason: ${matchedWaiver!.reason})`
            : rawReason,
          isWaived,
          appliedWaiverId,
          governanceEvidence: {
            providerBaselinePresent: unit.governanceEvidence.providerBaselinePresent,
            consumerBaselinePresent: unit.governanceEvidence.consumerBaselinePresent,
            providerAttested: unit.governanceEvidence.providerAttested,
            attestationStale: unit.governanceEvidence.attestationStale,
            providerGovernanceEnabled: providerGate ? providerGate.status !== 'GOVERNANCE_DISABLED' : true,
            providerLocalGateStatus,
          },
        });
      }
    }
  }

  // AGGREGATE DECISION PRECEDENCE EVALUATION
  let systemReleaseStatus: SystemReleaseStatus;

  // PRECEDENCE STEP 2 (if root local gate was blocked -> NON-WAIVABLE)
  if (isRootLocalGateBlocked) {
    systemReleaseStatus = 'BLOCKED';
    if (rootLocalGateResult.blockingDocuments.length > 0) {
      for (const blockDoc of rootLocalGateResult.blockingDocuments) {
        blockingDependencies.unshift({
          providerProjectId: projObjId.toString(),
          providerProjectName: rootProject.name,
          consumerDocumentTitle: blockDoc.title,
          providerDocumentTitle: blockDoc.title,
          targetDocumentId: blockDoc.id,
          contractVersionNumber: null,
          blockerType: 'PROVIDER_LOCAL_GATE_BLOCKED',
          reason: `ROOT_GATE_BLOCKED: ${blockDoc.reason}`,
          isWaived: false,
          appliedWaiverId: null,
          governanceEvidence: {
            providerBaselinePresent: true,
            consumerBaselinePresent: true,
            providerAttested: true,
            attestationStale: false,
            providerGovernanceEnabled: true,
            providerLocalGateStatus: 'BLOCKED',
          },
        });
      }
    }
  }
  // PRECEDENCE STEP 3: Topology Truncation Limit Exceeded (NON-WAIVABLE)
  else if (isTruncated) {
    systemReleaseStatus = 'INDETERMINATE';
  }
  // PRECEDENCE STEP 4: Missing Required Evidence (INDETERMINATE -> NON-WAIVABLE)
  else if (
    alignmentResult.aggregateState === 'INDETERMINATE' ||
    alignmentResult.summary.indeterminateUnits > 0
  ) {
    systemReleaseStatus = 'INDETERMINATE';
  }
  // PRECEDENCE STEP 5: Any Un-Waived Blocker Exists -> BLOCKED
  else if (unwaivedBlockersCount > 0) {
    systemReleaseStatus = 'BLOCKED';
  }
  // PRECEDENCE STEP 6: All Waivable Blockers Waived & Zero Unwaived Blockers -> PASSED_WITH_WAIVER
  else if (waivedBlockersCount > 0 && unwaivedBlockersCount === 0) {
    systemReleaseStatus = 'PASSED_WITH_WAIVER';
  }
  // PRECEDENCE STEP 7: Fully Satisfied Without Waivers -> PASSED
  else {
    systemReleaseStatus = 'PASSED';
  }

  // Boolean contract: passed === true ONLY for PASSED or PASSED_WITH_WAIVER
  const passed = systemReleaseStatus === 'PASSED' || systemReleaseStatus === 'PASSED_WITH_WAIVER';

  return {
    passed,
    systemReleaseStatus,
    rootProjectId: projObjId.toString(),
    evaluatedAt: evaluationTimestamp,
    summary: {
      totalDependencies: alignmentResult.summary.totalUnits,
      alignedDependencies: alignmentResult.summary.alignedUnits,
      misalignedDependencies: alignmentResult.summary.misalignedUnits,
      indeterminateDependencies: alignmentResult.summary.indeterminateUnits,
      blockedProviders: blockedProvidersCount,
      waivedBlockers: waivedBlockersCount,
      unwaivedBlockers: unwaivedBlockersCount,
    },
    evidence: {
      rootLocalGate: {
        status: rootLocalGateResult.status as 'PASSED' | 'BLOCKED' | 'GOVERNANCE_DISABLED',
        freshnessPercentage: rootLocalGateResult.freshnessPercentage,
      },
      baselineAlignment: {
        aggregateState: alignmentResult.aggregateState,
        alignmentScore: alignmentResult.alignmentScore,
        evidenceCompleteness: alignmentResult.evidenceCompleteness,
      },
      appliedWaiverIds: Array.from(appliedWaiverIdsSet),
      blockingDependencies,
    },
  };
}
