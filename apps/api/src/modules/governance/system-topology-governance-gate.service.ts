import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { evaluateReleaseGateInternal } from './release-gate-evaluator.service.js';
import { calculateSystemBaselineAlignment } from './system-baseline-alignment.service.js';
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

  const evaluatedAt = new Date();

  // PRECEDENCE STEP 1: Root Project Governance Disabled
  if (rootProject.governanceSettings?.isGovernanceEnabled === false) {
    const rootGateDisabledResult = await evaluateReleaseGateInternal(projObjId);
    return {
      passed: false, // Strictly: (systemReleaseStatus === 'PASSED')
      systemReleaseStatus: 'GOVERNANCE_DISABLED',
      rootProjectId: projObjId.toString(),
      evaluatedAt,
      summary: {
        totalDependencies: 0,
        alignedDependencies: 0,
        misalignedDependencies: 0,
        indeterminateDependencies: 0,
        blockedProviders: 0,
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
      // Check if unvisited DEPENDS_ON edges exist beyond current bound
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
      if (!canReadTgt) continue; // Privacy rule: omit unauthorized nodes completely

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

  // Evaluate Provider Local Gates & Build Evidence
  const blockingDependencies: BlockingDependencyDTO[] = [];
  const providerGateStatusMap = new Map<string, { passed: boolean; status: string; freshnessPercentage: number }>();
  let blockedProvidersCount = 0;

  // Inspect authorized provider projects (excluding root)
  for (const providerId of authorizedProjectIds) {
    if (providerId === projObjId.toString()) continue;

    const providerObjId = new Types.ObjectId(providerId);
    const providerProject = await Project.findOne({ _id: providerObjId, isArchived: false });
    if (!providerProject) continue;

    const providerGate = await evaluateReleaseGateInternal(providerObjId);
    providerGateStatusMap.set(providerId, {
      passed: providerGate.passed,
      status: providerGate.status,
      freshnessPercentage: providerGate.freshnessPercentage,
    });

    if (!providerGate.passed || providerGate.status === 'BLOCKED') {
      blockedProvidersCount += 1;
    }
  }

  // Map Phase 18 Alignment Units & Governance Evidence into Blocking Dependencies
  for (const unit of alignmentResult.alignmentUnits) {
    const providerId = unit.providerProject.id;
    const providerGate = providerGateStatusMap.get(providerId);
    const providerLocalGateStatus = providerGate ? providerGate.status : 'UNKNOWN';

    const isMisaligned = unit.alignmentState === 'MISALIGNED';
    const isUnattested = unit.governanceEvidence.providerBaselinePresent && !unit.governanceEvidence.providerAttested;
    const isAttestationStale = unit.governanceEvidence.attestationStale;
    const isProviderBlocked = providerGate ? (!providerGate.passed || providerGate.status === 'BLOCKED') : false;

    if (isMisaligned || isUnattested || isAttestationStale || isProviderBlocked) {
      let reason = '';
      if (isMisaligned) {
        reason = `MISALIGNED: Consumer baseline snapshot references version v${unit.consumerVersionRef?.versionNumber ?? 'unknown'}, but Provider active baseline is v${unit.providerActiveVersion?.versionNumber ?? 'unknown'}`;
      } else if (isUnattested) {
        reason = `UNATTESTED: Provider active baseline snapshot lacks required Phase 17 fulfillment attestation`;
      } else if (isAttestationStale) {
        reason = `STALE_ATTESTATION: Provider document head version has drifted beyond attested snapshot version`;
      } else if (isProviderBlocked) {
        reason = `PROVIDER_GATE_BLOCKED: Upstream provider project "${unit.providerProject.name}" has failing local document freshness or unreviewed drift`;
      }

      blockingDependencies.push({
        providerProjectId: unit.providerProject.id,
        providerProjectName: unit.providerProject.name,
        consumerDocumentTitle: unit.consumerDocument.title,
        providerDocumentTitle: unit.providerDocument.title,
        reason,
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

  // Aggregate Decision Precedence Evaluation
  let systemReleaseStatus: SystemReleaseStatus;

  // PRECEDENCE STEP 2 (if root local gate was blocked)
  if (isRootLocalGateBlocked) {
    systemReleaseStatus = 'BLOCKED';
    if (rootLocalGateResult.blockingDocuments.length > 0) {
      for (const blockDoc of rootLocalGateResult.blockingDocuments) {
        blockingDependencies.unshift({
          providerProjectId: projObjId.toString(),
          providerProjectName: rootProject.name,
          consumerDocumentTitle: blockDoc.title,
          providerDocumentTitle: blockDoc.title,
          reason: `ROOT_GATE_BLOCKED: ${blockDoc.reason}`,
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
  // PRECEDENCE STEP 3: Topology Truncation Limit Exceeded
  else if (isTruncated) {
    systemReleaseStatus = 'INDETERMINATE';
  }
  // PRECEDENCE STEP 4: Missing Required Evidence (Indeterminate)
  else if (
    alignmentResult.aggregateState === 'INDETERMINATE' ||
    alignmentResult.summary.indeterminateUnits > 0
  ) {
    systemReleaseStatus = 'INDETERMINATE';
  }
  // PRECEDENCE STEP 5, 6, 7, 8: Contract Misalignment, Unattested, Stale Attestation, or Provider Gate Blocked
  else if (
    alignmentResult.aggregateState === 'MISALIGNED' ||
    alignmentResult.summary.misalignedUnits > 0 ||
    blockingDependencies.length > 0
  ) {
    systemReleaseStatus = 'BLOCKED';
  }
  // PRECEDENCE STEP 9: Fully Satisfied -> PASSED
  else {
    systemReleaseStatus = 'PASSED';
  }

  // Strict passed boolean definition: ONLY true when systemReleaseStatus === 'PASSED'
  const passed = systemReleaseStatus === 'PASSED';

  return {
    passed,
    systemReleaseStatus,
    rootProjectId: projObjId.toString(),
    evaluatedAt,
    summary: {
      totalDependencies: alignmentResult.summary.totalUnits,
      alignedDependencies: alignmentResult.summary.alignedUnits,
      misalignedDependencies: alignmentResult.summary.misalignedUnits,
      indeterminateDependencies: alignmentResult.summary.indeterminateUnits,
      blockedProviders: blockedProvidersCount,
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
      blockingDependencies,
    },
  };
}
