import crypto from 'crypto';
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { Document } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { evaluateReleaseGateInternal } from './release-gate-evaluator.service.js';
import { calculateSystemBaselineAlignment } from './system-baseline-alignment.service.js';
import {
  SystemGovernanceWaiver,
  SystemBlockerType,
  ISystemGovernanceWaiver,
} from './system-governance-waiver.model.js';
import {
  evaluateSystemTopologyGovernanceGate,
  evaluateSystemGateFromState,
  matchWaiverForDependency,
} from './system-topology-governance-gate.service.js';
import type { BlockingDependencyDTO } from './system-topology-governance-gate.types.js';
import type {
  SimulateSystemGateInput,
  SimulateSystemGateOutput,
  AppliedCandidateWaiverDTO,
  FulfillmentAssumptionDTO,
} from './system-topology-simulation.types.js';

function validateObjectId(id: string, errorMessage = 'Invalid resource ID', code = 'NOT_FOUND'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function simulateSystemTopologyGovernanceGate(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  input: SimulateSystemGateInput,
): Promise<SimulateSystemGateOutput> {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');

  const rootObjId = new Types.ObjectId(projectId);
  const rootProject = await Project.findOne({ _id: rootObjId, isArchived: false });
  if (!rootProject) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  // 1. ACL Boundary Validation for Root Project
  const canReadRoot = await checkUserProjectReadAccess(userId, role, projectId);
  if (!canReadRoot) {
    throw new AppError('Access denied to project', 403, 'FORBIDDEN');
  }

  // 2. STAGE A: ACL & Entity Validation for Scenario Inputs
  if (input.proposedBaselines && input.proposedBaselines.length > 0) {
    for (const pb of input.proposedBaselines) {
      validateObjectId(pb.providerProjectId, 'Provider project not found', 'PROJECT_NOT_FOUND');
      validateObjectId(pb.targetDocumentId, 'Target document not found', 'DOCUMENT_NOT_FOUND');

      const canReadProvider = await checkUserProjectReadAccess(userId, role, pb.providerProjectId);
      if (!canReadProvider) {
        throw new AppError('Access denied to project', 403, 'FORBIDDEN');
      }

      const doc = await Document.findOne({ _id: new Types.ObjectId(pb.targetDocumentId), isDeleted: false });
      if (!doc) {
        throw new AppError('Target document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      const ver = await DocumentVersion.findOne({
        documentId: doc._id,
        versionNumber: pb.versionNumber,
      });
      if (!ver) {
        throw new AppError(
          `Document version v${pb.versionNumber} does not exist for document "${doc.title}"`,
          404,
          'DOCUMENT_NOT_FOUND',
        );
      }
    }
  }

  if (input.proposedAttestations && input.proposedAttestations.length > 0) {
    for (const pa of input.proposedAttestations) {
      validateObjectId(pa.providerProjectId, 'Provider project not found', 'PROJECT_NOT_FOUND');
      const canReadProvider = await checkUserProjectReadAccess(userId, role, pa.providerProjectId);
      if (!canReadProvider) {
        throw new AppError('Access denied to project', 403, 'FORBIDDEN');
      }
    }
  }

  if (input.candidateWaivers && input.candidateWaivers.length > 0) {
    for (const cw of input.candidateWaivers) {
      validateObjectId(cw.targetProviderProjectId, 'Provider project not found', 'PROJECT_NOT_FOUND');
      const canReadProvider = await checkUserProjectReadAccess(userId, role, cw.targetProviderProjectId);
      if (!canReadProvider) {
        throw new AppError('Access denied to project', 403, 'FORBIDDEN');
      }

      if (cw.targetDocumentId) {
        validateObjectId(cw.targetDocumentId, 'Target document not found', 'DOCUMENT_NOT_FOUND');
        const doc = await Document.findOne({ _id: new Types.ObjectId(cw.targetDocumentId), isDeleted: false });
        if (!doc) {
          throw new AppError('Target document not found', 404, 'DOCUMENT_NOT_FOUND');
        }
      }
    }
  }

  if (input.proposedTopologyLinks && input.proposedTopologyLinks.length > 0) {
    for (const tl of input.proposedTopologyLinks) {
      validateObjectId(tl.targetProjectId, 'Target project not found', 'PROJECT_NOT_FOUND');
      if (tl.targetProjectId === projectId) {
        throw new AppError('Self-referential topology links are not allowed', 400, 'VALIDATION_ERROR');
      }

      const canReadTarget = await checkUserProjectReadAccess(userId, role, tl.targetProjectId);
      if (!canReadTarget) {
        throw new AppError('Access denied to project', 403, 'FORBIDDEN');
      }
    }
  }

  // 3. Authoritative Live Baseline Evaluation
  const liveBaselineResult = await evaluateSystemTopologyGovernanceGate(userId, role, projectId);
  const evaluationTimestamp = new Date();

  // 4. STAGE B: In-Memory Scenario Overlay Construction
  // Cloned Active Waivers list including simulated Candidate Waivers
  const liveWaivers = (await SystemGovernanceWaiver.find({
    rootProjectId: rootObjId,
    scopeState: 'ACTIVE',
    isRevoked: false,
    expiresAt: { $gt: evaluationTimestamp },
  }).lean()) as (ISystemGovernanceWaiver & { _id: Types.ObjectId })[];

  const inMemoryWaivers: (ISystemGovernanceWaiver & { _id: Types.ObjectId })[] = [...liveWaivers];
  const appliedCandidateWaiversDTOs: AppliedCandidateWaiverDTO[] = [];

  if (input.candidateWaivers && input.candidateWaivers.length > 0) {
    input.candidateWaivers.forEach((cw) => {
      const days = Math.min(Math.max(cw.expiresInDays || 30, 1), 365);
      const simWaiver: ISystemGovernanceWaiver & { _id: Types.ObjectId } = {
        _id: new Types.ObjectId(),
        rootProjectId: rootObjId,
        targetProviderProjectId: new Types.ObjectId(cw.targetProviderProjectId),
        targetDocumentId: cw.targetDocumentId ? new Types.ObjectId(cw.targetDocumentId) : null,
        contractVersionNumber: cw.contractVersionNumber ?? null,
        blockerType: cw.blockerType,
        activeScopeKey: `sim:${cw.targetProviderProjectId}:${cw.blockerType}`,
        scopeState: 'ACTIVE',
        reason: `[SIMULATED] ${cw.reason.trim()}`,
        grantedByUserId: new Types.ObjectId(userId),
        expiresAt: new Date(evaluationTimestamp.getTime() + days * 86400000),
        isRevoked: false,
        createdAt: evaluationTimestamp,
        updatedAt: evaluationTimestamp,
      };
      inMemoryWaivers.push(simWaiver);
    });
  }

  // Topology Traversal with Proposed Link Overlay (ADD / REMOVE)
  const MAX_DEPTH = 3;
  const MAX_NODES = 50;

  const queue: Array<{ id: string; depth: number }> = [{ id: projectId, depth: 1 }];
  const visitedProjectIds = new Set<string>([projectId]);
  const authorizedProjectIds = new Set<string>([projectId]);
  let isTruncated = false;

  const proposedAdds = new Set(
    (input.proposedTopologyLinks || [])
      .filter((tl) => tl.action === 'ADD' && tl.dependencyType === 'DEPENDS_ON')
      .map((tl) => tl.targetProjectId),
  );
  const proposedRemoves = new Set(
    (input.proposedTopologyLinks || [])
      .filter((tl) => tl.action === 'REMOVE' && tl.dependencyType === 'DEPENDS_ON')
      .map((tl) => tl.targetProjectId),
  );

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.depth >= MAX_DEPTH || authorizedProjectIds.size >= MAX_NODES) {
      const currentObjId = new Types.ObjectId(current.id);
      const unvisitedCount = await ProjectTopologyLink.countDocuments({
        sourceProjectId: currentObjId,
        type: 'DEPENDS_ON',
      });
      if (unvisitedCount > 0) isTruncated = true;
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

    const candidateTargetIds = new Set<string>();
    for (const link of topologyLinks) {
      if (link.targetProjectId && !link.targetProjectId.isArchived) {
        candidateTargetIds.add(link.targetProjectId._id.toString());
      }
    }

    // Apply Overlay Link Changes for root project
    if (current.id === projectId) {
      proposedAdds.forEach((id) => candidateTargetIds.add(id));
      proposedRemoves.forEach((id) => candidateTargetIds.delete(id));
    }

    for (const tgtId of candidateTargetIds) {
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

  // Baseline Alignment Calculation & In-Memory Overlays
  const alignmentResult = await calculateSystemBaselineAlignment(userId, role, projectId);
  const inMemoryAlignmentUnits = alignmentResult.alignmentUnits
    .filter((unit) => authorizedProjectIds.has(unit.providerProject.id))
    .map((unit) => ({ ...unit }));

  // Overlay Proposed Baselines
  if (input.proposedBaselines && input.proposedBaselines.length > 0) {
    for (const pb of input.proposedBaselines) {
      inMemoryAlignmentUnits.forEach((unit) => {
        if (
          unit.providerProject.id === pb.providerProjectId &&
          unit.providerDocument?.id === pb.targetDocumentId
        ) {
          unit.providerActiveVersion = {
            versionNumber: pb.versionNumber,
            checksum: `sim:checksum:v${pb.versionNumber}`,
          };
          unit.consumerVersionRef = {
            versionNumber: pb.versionNumber,
            checksum: `sim:checksum:v${pb.versionNumber}`,
          };
          unit.alignmentState = 'ALIGNED';
        }
      });
    }
  }

  // Overlay Proposed Attestations (Fulfillment Assumptions)
  const fulfillmentAssumptionsDTOs: FulfillmentAssumptionDTO[] = [];
  if (input.proposedAttestations && input.proposedAttestations.length > 0) {
    for (const pa of input.proposedAttestations) {
      inMemoryAlignmentUnits.forEach((unit) => {
        if (unit.providerProject.id === pa.providerProjectId) {
          unit.governanceEvidence = {
            ...unit.governanceEvidence,
            providerAttested: true,
            attestationStale: false,
          };
        }
      });
      fulfillmentAssumptionsDTOs.push({
        packageId: pa.changePackageId ?? undefined,
        providerProjectId: pa.providerProjectId,
        assumedFulfillable: true,
        isHypothetical: true,
      });
    }
  }

  // Evaluate Provider Local Gates
  const rootGateResult = await evaluateReleaseGateInternal(rootObjId);
  const isRootLocalGateBlocked = !rootGateResult.passed || rootGateResult.status === 'BLOCKED';

  const providerGateMap = new Map<
    string,
    { passed: boolean; status: string; freshnessPercentage: number; blockingDocuments: Array<{ id: string; title: string; reason: string }> }
  >();
  let blockedProvidersCount = 0;

  for (const providerId of authorizedProjectIds) {
    if (providerId === projectId) continue;

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
      blockedProvidersCount++;
    }
  }

  // 5. STAGE C: Derived Blocker & Waiver Evaluation Over In-Memory State
  const blockingDependencies: BlockingDependencyDTO[] = [];
  const appliedWaiverIdsSet = new Set<string>();
  let waivedBlockersCount = 0;
  let unwaivedBlockersCount = 0;

  for (const unit of inMemoryAlignmentUnits) {
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

      if (blockerType === 'PROVIDER_LOCAL_GATE_BLOCKED' && providerGate && providerGate.blockingDocuments.length > 0) {
        for (const blockDoc of providerGate.blockingDocuments) {
          const docTargetId = blockDoc.id;
          const matchedWaiver = matchWaiverForDependency(
            'PROVIDER_LOCAL_GATE_BLOCKED',
            providerId,
            docTargetId,
            contractVersionNumber,
            inMemoryWaivers,
          );

          const isWaived = Boolean(matchedWaiver);
          const appliedWaiverId = matchedWaiver ? String((matchedWaiver as unknown as { _id: unknown })._id) : null;

          if (isWaived && appliedWaiverId) {
            waivedBlockersCount++;
            appliedWaiverIdsSet.add(appliedWaiverId);
            if (appliedWaiverId.startsWith('sim_') || String(matchedWaiver?.reason).includes('[SIMULATED]')) {
              appliedCandidateWaiversDTOs.push({
                targetProviderProjectId: providerId,
                blockerType: 'PROVIDER_LOCAL_GATE_BLOCKED',
                reason: matchedWaiver!.reason,
                coverageImpact: `Waived local gate blocker for document "${blockDoc.title}"`,
              });
            }
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
        targetDocumentId = unit.providerDocument?.id ?? null;
        const matchedWaiver = matchWaiverForDependency(
          blockerType,
          providerId,
          targetDocumentId,
          contractVersionNumber,
          inMemoryWaivers,
        );

        const isWaived = Boolean(matchedWaiver);
        const appliedWaiverId = matchedWaiver ? String((matchedWaiver as unknown as { _id: unknown })._id) : null;

        if (isWaived && appliedWaiverId) {
          waivedBlockersCount++;
          appliedWaiverIdsSet.add(appliedWaiverId);
          if (appliedWaiverId.startsWith('sim_') || String(matchedWaiver?.reason).includes('[SIMULATED]')) {
            appliedCandidateWaiversDTOs.push({
              targetProviderProjectId: providerId,
              blockerType,
              reason: matchedWaiver!.reason,
              coverageImpact: `Waived ${blockerType} blocker for provider project "${unit.providerProject.name}"`,
            });
          }
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

  // 6. Execute Pure Evaluator Extraction
  const alignedUnitsCount = inMemoryAlignmentUnits.filter((u) => u.alignmentState === 'ALIGNED').length;
  const misalignedUnitsCount = inMemoryAlignmentUnits.filter((u) => u.alignmentState === 'MISALIGNED').length;
  const indeterminateUnitsCount = inMemoryAlignmentUnits.filter((u) => u.alignmentState === 'INDETERMINATE').length;
  const aggregateState =
    inMemoryAlignmentUnits.length === 0
      ? 'ZERO_APPLICABLE_EVIDENCE'
      : indeterminateUnitsCount > 0
        ? 'INDETERMINATE'
        : misalignedUnitsCount > 0
          ? 'MISALIGNED'
          : 'ALIGNED';

  const simulatedGateResult = evaluateSystemGateFromState({
    isRootLocalGateBlocked,
    rootLocalGateResult: {
      status: rootGateResult.status as 'PASSED' | 'BLOCKED' | 'GOVERNANCE_DISABLED',
      freshnessPercentage: rootGateResult.freshnessPercentage,
      blockingDocuments: rootGateResult.blockingDocuments || [],
    },
    rootProjectId: projectId,
    rootProjectName: rootProject.name,
    evaluationTimestamp,
    isTruncated,
    alignmentResult: {
      aggregateState,
      alignmentScore: alignmentResult.alignmentScore,
      evidenceCompleteness: alignmentResult.evidenceCompleteness,
      summary: {
        totalUnits: inMemoryAlignmentUnits.length,
        alignedUnits: alignedUnitsCount,
        misalignedUnits: misalignedUnitsCount,
        indeterminateUnits: indeterminateUnitsCount,
      },
    },
    blockedProvidersCount,
    waivedBlockersCount,
    unwaivedBlockersCount,
    appliedWaiverIdsSet,
    blockingDependencies,
  });

  // 7. STAGE D: Delta Analysis & Simulation Output Construction
  const baselineBlockersMap = new Map<string, BlockingDependencyDTO>();
  liveBaselineResult.evidence.blockingDependencies.forEach((b) => {
    const key = `${b.providerProjectId}:${b.blockerType}:${b.targetDocumentId || 'all'}`;
    baselineBlockersMap.set(key, b);
  });

  const simulatedBlockersMap = new Map<string, BlockingDependencyDTO>();
  simulatedGateResult.evidence.blockingDependencies.forEach((b) => {
    const key = `${b.providerProjectId}:${b.blockerType}:${b.targetDocumentId || 'all'}`;
    simulatedBlockersMap.set(key, b);
  });

  const resolvedBlockers: BlockingDependencyDTO[] = [];
  const remainingBlockers: BlockingDependencyDTO[] = [];
  const newlyIntroducedBlockers: BlockingDependencyDTO[] = [];

  liveBaselineResult.evidence.blockingDependencies.forEach((b) => {
    const key = `${b.providerProjectId}:${b.blockerType}:${b.targetDocumentId || 'all'}`;
    const simB = simulatedBlockersMap.get(key);
    if (!simB || (b.isWaived === false && simB.isWaived === true)) {
      resolvedBlockers.push(b);
    } else {
      remainingBlockers.push(simB);
    }
  });

  simulatedGateResult.evidence.blockingDependencies.forEach((b) => {
    const key = `${b.providerProjectId}:${b.blockerType}:${b.targetDocumentId || 'all'}`;
    if (!baselineBlockersMap.has(key)) {
      newlyIntroducedBlockers.push(b);
    }
  });

  const statusChanged = liveBaselineResult.systemReleaseStatus !== simulatedGateResult.systemReleaseStatus;

  return {
    isSimulated: true,
    simulationId: crypto.randomUUID(),
    evaluatedAt: evaluationTimestamp,
    rootProjectId: projectId,
    baselineGateStatus: liveBaselineResult.systemReleaseStatus,
    simulatedGateStatus: simulatedGateResult.systemReleaseStatus,
    statusChanged,
    passed: simulatedGateResult.passed,
    simulationStatus: isTruncated ? 'TRUNCATED_PARTIAL' : 'COMPLETE',
    deltaSummary: {
      resolvedBlockersCount: resolvedBlockers.length,
      remainingBlockersCount: remainingBlockers.length,
      newlyIntroducedBlockersCount: newlyIntroducedBlockers.length,
      candidateWaiversAppliedCount: appliedCandidateWaiversDTOs.length,
    },
    resolvedBlockers,
    remainingBlockers,
    newlyIntroducedBlockers,
    appliedCandidateWaivers: appliedCandidateWaiversDTOs,
    fulfillmentAssumptions: fulfillmentAssumptionsDTOs,
  };
}
