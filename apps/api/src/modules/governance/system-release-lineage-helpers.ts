import type {
  ITopologyNodeSnapshot,
  ITopologyEdgeSnapshot,
  IBaselineSnapshot,
  IWaiverSnapshot,
  IAttestationSnapshot,
  ISystemReleaseSnapshot,
} from './system-release-certificate.types.js';
import type {
  TopologyDeltaDTO,
  TopologyNodeDeltaDTO,
  TopologyEdgeDeltaDTO,
  BaselineDeltaItemDTO,
  WaiverDeltaItemDTO,
  AttestationDeltaItemDTO,
  TrajectorySummaryDTO,
} from './system-release-lineage.types.js';
import type { ContractDeltaItemDTO } from './system-contract-evolution.types.js';

/**
 * Computes deterministic structural topology deltas between source and target snapshots
 */
export function diffTopologySnapshots(
  sourceNodes: ITopologyNodeSnapshot[] = [],
  sourceEdges: ITopologyEdgeSnapshot[] = [],
  targetNodes: ITopologyNodeSnapshot[] = [],
  targetEdges: ITopologyEdgeSnapshot[] = []
): TopologyDeltaDTO {
  const sourceNodeMap = new Map<string, ITopologyNodeSnapshot>();
  sourceNodes.forEach((n) => sourceNodeMap.set(n.projectId, n));

  const targetNodeMap = new Map<string, ITopologyNodeSnapshot>();
  targetNodes.forEach((n) => targetNodeMap.set(n.projectId, n));

  const addedNodes: TopologyNodeDeltaDTO[] = [];
  const removedNodes: TopologyNodeDeltaDTO[] = [];
  const unchangedNodes: TopologyNodeDeltaDTO[] = [];

  // Check target nodes
  targetNodes.forEach((tNode) => {
    if (!sourceNodeMap.has(tNode.projectId)) {
      addedNodes.push({
        projectId: tNode.projectId,
        projectName: tNode.projectName,
        deltaType: 'ADDED',
      });
    } else {
      unchangedNodes.push({
        projectId: tNode.projectId,
        projectName: tNode.projectName,
        deltaType: 'UNCHANGED',
      });
    }
  });

  // Check source nodes for removed ones
  sourceNodes.forEach((sNode) => {
    if (!targetNodeMap.has(sNode.projectId)) {
      removedNodes.push({
        projectId: sNode.projectId,
        projectName: sNode.projectName,
        deltaType: 'REMOVED',
      });
    }
  });

  // Edge comparison
  const edgeKey = (e: ITopologyEdgeSnapshot) => `${e.sourceProjectId}:${e.targetProjectId}`;
  const sourceEdgeMap = new Map<string, ITopologyEdgeSnapshot>();
  sourceEdges.forEach((e) => sourceEdgeMap.set(edgeKey(e), e));

  const targetEdgeMap = new Map<string, ITopologyEdgeSnapshot>();
  targetEdges.forEach((e) => targetEdgeMap.set(edgeKey(e), e));

  const addedEdges: TopologyEdgeDeltaDTO[] = [];
  const removedEdges: TopologyEdgeDeltaDTO[] = [];
  const modifiedEdges: TopologyEdgeDeltaDTO[] = [];
  const unchangedEdges: TopologyEdgeDeltaDTO[] = [];

  targetEdges.forEach((tEdge) => {
    const key = edgeKey(tEdge);
    const sEdge = sourceEdgeMap.get(key);

    if (!sEdge) {
      addedEdges.push({
        sourceProjectId: tEdge.sourceProjectId,
        targetProjectId: tEdge.targetProjectId,
        linkType: tEdge.linkType,
        deltaType: 'ADDED',
      });
    } else if (sEdge.linkType !== tEdge.linkType) {
      modifiedEdges.push({
        sourceProjectId: tEdge.sourceProjectId,
        targetProjectId: tEdge.targetProjectId,
        linkType: tEdge.linkType,
        deltaType: 'MODIFIED',
      });
    } else {
      unchangedEdges.push({
        sourceProjectId: tEdge.sourceProjectId,
        targetProjectId: tEdge.targetProjectId,
        linkType: tEdge.linkType,
        deltaType: 'UNCHANGED',
      });
    }
  });

  sourceEdges.forEach((sEdge) => {
    const key = edgeKey(sEdge);
    if (!targetEdgeMap.has(key)) {
      removedEdges.push({
        sourceProjectId: sEdge.sourceProjectId,
        targetProjectId: sEdge.targetProjectId,
        linkType: sEdge.linkType,
        deltaType: 'REMOVED',
      });
    }
  });

  return {
    addedNodes,
    removedNodes,
    unchangedNodes,
    addedEdges,
    removedEdges,
    unchangedEdges: [...unchangedEdges, ...modifiedEdges],
  };
}

/**
 * Computes deterministic baseline version deltas between source and target active baselines
 */
export function diffBaselineSnapshots(
  sourceBaselines: IBaselineSnapshot[] = [],
  targetBaselines: IBaselineSnapshot[] = []
): BaselineDeltaItemDTO[] {
  const sourceMap = new Map<string, IBaselineSnapshot>();
  sourceBaselines.forEach((b) => sourceMap.set(b.projectId, b));

  const targetMap = new Map<string, IBaselineSnapshot>();
  targetBaselines.forEach((b) => targetMap.set(b.projectId, b));

  const deltas: BaselineDeltaItemDTO[] = [];

  targetBaselines.forEach((tBase) => {
    const sBase = sourceMap.get(tBase.projectId);

    if (!sBase) {
      deltas.push({
        projectId: tBase.projectId,
        projectName: tBase.projectName,
        targetVersionTag: tBase.versionTag,
        targetBaselineId: tBase.baselineId,
        deltaType: 'ADDED_BASELINE',
      });
    } else if (sBase.baselineId === tBase.baselineId && sBase.versionTag === tBase.versionTag) {
      deltas.push({
        projectId: tBase.projectId,
        projectName: tBase.projectName,
        sourceVersionTag: sBase.versionTag,
        targetVersionTag: tBase.versionTag,
        sourceBaselineId: sBase.baselineId,
        targetBaselineId: tBase.baselineId,
        deltaType: 'UNCHANGED_BASELINE',
      });
    } else {
      // Version changed
      const sTime = new Date(sBase.createdTimestamp).getTime();
      const tTime = new Date(tBase.createdTimestamp).getTime();

      const deltaType =
        tTime >= sTime || tBase.versionTag > sBase.versionTag
          ? 'VERSION_ADVANCED'
          : 'VERSION_REGRESSED';

      deltas.push({
        projectId: tBase.projectId,
        projectName: tBase.projectName,
        sourceVersionTag: sBase.versionTag,
        targetVersionTag: tBase.versionTag,
        sourceBaselineId: sBase.baselineId,
        targetBaselineId: tBase.baselineId,
        deltaType,
      });
    }
  });

  sourceBaselines.forEach((sBase) => {
    if (!targetMap.has(sBase.projectId)) {
      deltas.push({
        projectId: sBase.projectId,
        projectName: sBase.projectName,
        sourceVersionTag: sBase.versionTag,
        sourceBaselineId: sBase.baselineId,
        deltaType: 'REMOVED_BASELINE',
      });
    }
  });

  return deltas;
}

/**
 * Computes deterministic waiver deltas between source and target waiver snapshots
 */
export function diffWaiverSnapshots(
  sourceWaivers: IWaiverSnapshot[] = [],
  targetWaivers: IWaiverSnapshot[] = [],
  targetCertTimestamp?: string
): WaiverDeltaItemDTO[] {
  const waiverKey = (w: IWaiverSnapshot) =>
    `${w.targetProviderProjectId}:${w.blockerType}:${w.targetDocumentId || ''}`;

  const sourceMap = new Map<string, IWaiverSnapshot>();
  sourceWaivers.forEach((w) => sourceMap.set(waiverKey(w), w));

  const targetMap = new Map<string, IWaiverSnapshot>();
  targetWaivers.forEach((w) => targetMap.set(waiverKey(w), w));

  const deltas: WaiverDeltaItemDTO[] = [];
  const targetTime = targetCertTimestamp ? new Date(targetCertTimestamp).getTime() : Date.now();

  targetWaivers.forEach((tWaiver) => {
    const key = waiverKey(tWaiver);
    const sWaiver = sourceMap.get(key);

    const item: WaiverDeltaItemDTO = {
      waiverId: tWaiver.waiverId,
      targetProviderProjectId: tWaiver.targetProviderProjectId,
      blockerType: tWaiver.blockerType,
      waiverScope: tWaiver.waiverScope,
      deltaType: 'NEWLY_GRANTED',
    };
    if (tWaiver.targetDocumentId) {
      item.targetDocumentId = tWaiver.targetDocumentId;
    }

    if (!sWaiver) {
      deltas.push(item);
    } else if (sWaiver.waiverScope !== tWaiver.waiverScope) {
      item.deltaType = 'SCOPE_CHANGED';
      deltas.push(item);
    } else {
      item.deltaType = 'CARRIED_FORWARD';
      deltas.push(item);
    }
  });

  sourceWaivers.forEach((sWaiver) => {
    const key = waiverKey(sWaiver);
    if (!targetMap.has(key)) {
      const expTime = sWaiver.expiresAt ? new Date(sWaiver.expiresAt).getTime() : Infinity;
      const isExpired = expTime <= targetTime;

      const item: WaiverDeltaItemDTO = {
        waiverId: sWaiver.waiverId,
        targetProviderProjectId: sWaiver.targetProviderProjectId,
        blockerType: sWaiver.blockerType,
        waiverScope: sWaiver.waiverScope,
        deltaType: isExpired ? 'EXPIRED_POST_CERTIFICATION' : 'RESOLVED',
      };
      if (sWaiver.targetDocumentId) {
        item.targetDocumentId = sWaiver.targetDocumentId;
      }
      deltas.push(item);
    }
  });

  return deltas;
}

/**
 * Computes deterministic attestation deltas between source and target attestation snapshots
 */
export function diffAttestationSnapshots(
  sourceAttestations: IAttestationSnapshot[] = [],
  targetAttestations: IAttestationSnapshot[] = []
): AttestationDeltaItemDTO[] {
  const sourceMap = new Map<string, IAttestationSnapshot>();
  sourceAttestations.forEach((a) => sourceMap.set(a.packageId, a));

  const targetMap = new Map<string, IAttestationSnapshot>();
  targetAttestations.forEach((a) => targetMap.set(a.packageId, a));

  const deltas: AttestationDeltaItemDTO[] = [];

  targetAttestations.forEach((tAttest) => {
    const sAttest = sourceMap.get(tAttest.packageId);

    if (!sAttest) {
      deltas.push({
        attestationId: tAttest.attestationId,
        packageId: tAttest.packageId,
        packageName: tAttest.packageName,
        fulfillmentStatus: tAttest.fulfillmentStatus,
        deltaType: 'EVIDENCE_ADDED',
      });
    } else {
      deltas.push({
        attestationId: tAttest.attestationId,
        packageId: tAttest.packageId,
        packageName: tAttest.packageName,
        fulfillmentStatus: tAttest.fulfillmentStatus,
        deltaType: 'EVIDENCE_UNCHANGED',
      });
    }
  });

  sourceAttestations.forEach((sAttest) => {
    if (!targetMap.has(sAttest.packageId)) {
      deltas.push({
        attestationId: sAttest.attestationId,
        packageId: sAttest.packageId,
        packageName: sAttest.packageName,
        fulfillmentStatus: sAttest.fulfillmentStatus,
        deltaType: 'EVIDENCE_REMOVED',
      });
    }
  });

  return deltas;
}

/**
 * Pure 4-tier trajectory precedence evaluation algorithm
 */
export function calculateTrajectoryMetrics(
  sourceSnapshot: ISystemReleaseSnapshot,
  targetSnapshot: ISystemReleaseSnapshot,
  contractDeltas: ContractDeltaItemDTO[] = []
): TrajectorySummaryDTO {
  const summaryA = sourceSnapshot?.evidenceSummary;
  const summaryB = targetSnapshot?.evidenceSummary;

  const totalA = summaryA?.totalApplicableContracts ?? 0;
  const totalB = summaryB?.totalApplicableContracts ?? 0;

  const scoreA = summaryA?.systemAlignmentScore;
  const scoreB = summaryB?.systemAlignmentScore;

  const deltaWaiverCount =
    (targetSnapshot.activeWaivers?.length || 0) - (sourceSnapshot.activeWaivers?.length || 0);
  const deltaAttestationCount =
    (targetSnapshot.activeAttestations?.length || 0) -
    (sourceSnapshot.activeAttestations?.length || 0);

  const breakingCodes = [
    'ENDPOINT_REMOVED',
    'FIELD_TYPE_CHANGED',
    'FIELD_REMOVED',
    'ENUM_VALUE_REMOVED',
  ];
  const hasBreakingContractDeltas = contractDeltas.some(
    (d) => d.riskTier === 'BREAKING' || breakingCodes.includes(d.deltaCode)
  );

  // Tier 1: INDETERMINATE check ($N_applicable = 0$ or missing summary)
  if (totalA === 0 || totalB === 0 || scoreA === undefined || scoreB === undefined) {
    return {
      classification: 'INDETERMINATE',
      deltaAlignmentScore: null,
      deltaWaiverCount,
      deltaAttestationCount,
      hasBreakingContractDeltas,
      evaluationStatus: 'INDETERMINATE',
      statusReason:
        totalA === 0 || totalB === 0
          ? 'ZERO_APPLICABLE_EVIDENCE'
          : 'MISSING_HISTORICAL_EVIDENCE',
    };
  }

  const deltaAlignmentScore = Math.round((scoreB - scoreA) * 10) / 10;

  // Tier 2: DEGRADED check
  const isStatusRegressed =
    sourceSnapshot.systemReleaseStatus === 'PASSED' &&
    targetSnapshot.systemReleaseStatus === 'PASSED_WITH_WAIVER';

  if (
    hasBreakingContractDeltas ||
    deltaAlignmentScore < 0 ||
    isStatusRegressed ||
    (deltaWaiverCount > 0 && deltaAlignmentScore <= 0)
  ) {
    return {
      classification: 'DEGRADED',
      deltaAlignmentScore,
      deltaWaiverCount,
      deltaAttestationCount,
      hasBreakingContractDeltas,
      evaluationStatus: 'COMPLETE',
    };
  }

  // Tier 3: IMPROVED check
  if (deltaAlignmentScore > 0 && deltaWaiverCount <= 0 && !hasBreakingContractDeltas) {
    return {
      classification: 'IMPROVED',
      deltaAlignmentScore,
      deltaWaiverCount,
      deltaAttestationCount,
      hasBreakingContractDeltas,
      evaluationStatus: 'COMPLETE',
    };
  }

  // Tier 4: STABLE default
  return {
    classification: 'STABLE',
    deltaAlignmentScore,
    deltaWaiverCount,
    deltaAttestationCount,
    hasBreakingContractDeltas,
    evaluationStatus: 'COMPLETE',
  };
}
