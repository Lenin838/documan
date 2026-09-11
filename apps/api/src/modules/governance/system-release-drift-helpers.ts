import type {
  ITopologyNodeSnapshot,
  ITopologyEdgeSnapshot,
  IBaselineSnapshot,
  IWaiverSnapshot,
  IAttestationSnapshot,
} from './system-release-certificate.types.js';
import type { ContractDeltaItemDTO } from './system-contract-evolution.types.js';
import type {
  LiveComplianceStatus,
  BaselineDeltaItemDTO,
  WaiverDeltaItemDTO,
  AttestationDeltaItemDTO,
} from './system-release-drift.types.js';

export interface TopologyDiffResult {
  addedNodes: ITopologyNodeSnapshot[];
  removedNodes: ITopologyNodeSnapshot[];
  addedEdges: ITopologyEdgeSnapshot[];
  removedEdges: ITopologyEdgeSnapshot[];
  varianceCount: number;
}

/**
 * Computes topology deltas between certified snapshot nodes/edges and live topology
 */
export function diffTopologyWithLive(
  certNodes: ITopologyNodeSnapshot[],
  certEdges: ITopologyEdgeSnapshot[],
  liveNodes: ITopologyNodeSnapshot[],
  liveEdges: ITopologyEdgeSnapshot[]
): TopologyDiffResult {
  const certNodeSet = new Set((certNodes || []).map((n) => n.projectId));
  const liveNodeSet = new Set((liveNodes || []).map((n) => n.projectId));

  const addedNodes = (liveNodes || []).filter((n) => !certNodeSet.has(n.projectId));
  const removedNodes = (certNodes || []).filter((n) => !liveNodeSet.has(n.projectId));

  const edgeKey = (e: ITopologyEdgeSnapshot) =>
    `${e.sourceProjectId}->${e.targetProjectId}:${e.linkType}`;

  const certEdgeSet = new Set((certEdges || []).map(edgeKey));
  const liveEdgeSet = new Set((liveEdges || []).map(edgeKey));

  const addedEdges = (liveEdges || []).filter((e) => !certEdgeSet.has(edgeKey(e)));
  const removedEdges = (certEdges || []).filter((e) => !liveEdgeSet.has(edgeKey(e)));

  const varianceCount =
    addedNodes.length + removedNodes.length + addedEdges.length + removedEdges.length;

  return {
    addedNodes,
    removedNodes,
    addedEdges,
    removedEdges,
    varianceCount,
  };
}

/**
 * Computes baseline deltas between certified baseline snapshots and current live active baselines
 */
export function diffBaselinesWithLive(
  certBaselines: IBaselineSnapshot[],
  liveBaselines: Array<{
    projectId: string;
    projectName: string;
    baselineId: string;
    versionTag: string;
  }>
): BaselineDeltaItemDTO[] {
  const deltas: BaselineDeltaItemDTO[] = [];
  const liveMap = new Map<string, { baselineId: string; versionTag: string; projectName: string }>();

  for (const lb of liveBaselines || []) {
    liveMap.set(lb.projectId, lb);
  }

  for (const cb of certBaselines || []) {
    const live = liveMap.get(cb.projectId);

    if (!live) {
      deltas.push({
        projectId: cb.projectId,
        projectName: cb.projectName,
        certifiedBaselineId: cb.baselineId,
        certifiedVersionTag: cb.versionTag,
        deltaType: 'BASELINE_DEACTIVATED',
        explanation: `Certified active baseline (${cb.versionTag}) was deactivated or removed in live state without replacement.`,
      });
      continue;
    }

    if (live.baselineId === cb.baselineId && live.versionTag === cb.versionTag) {
      deltas.push({
        projectId: cb.projectId,
        projectName: cb.projectName,
        certifiedBaselineId: cb.baselineId,
        certifiedVersionTag: cb.versionTag,
        liveBaselineId: live.baselineId,
        liveVersionTag: live.versionTag,
        deltaType: 'UNCHANGED',
        explanation: `Baseline active version (${cb.versionTag}) is identical to certified state.`,
      });
    } else if (live.baselineId !== cb.baselineId) {
      deltas.push({
        projectId: cb.projectId,
        projectName: cb.projectName,
        certifiedBaselineId: cb.baselineId,
        certifiedVersionTag: cb.versionTag,
        liveBaselineId: live.baselineId,
        liveVersionTag: live.versionTag,
        deltaType: 'BASELINE_REPLACED',
        explanation: `Certified baseline (${cb.baselineId}) was replaced by a new baseline (${live.baselineId}) in live state.`,
      });
    } else {
      // Different version tag
      // Simple heuristic: if live versionTag !== cert versionTag
      deltas.push({
        projectId: cb.projectId,
        projectName: cb.projectName,
        certifiedBaselineId: cb.baselineId,
        certifiedVersionTag: cb.versionTag,
        liveBaselineId: live.baselineId,
        liveVersionTag: live.versionTag,
        deltaType: 'VERSION_ADVANCED',
        explanation: `Active baseline version advanced from certified ${cb.versionTag} to live ${live.versionTag}.`,
      });
    }
  }

  return deltas;
}

/**
 * Computes policy waiver deltas between certified waiver snapshots and live active waivers at T_now
 */
export function diffWaiversWithLive(
  certWaivers: IWaiverSnapshot[],
  liveWaivers: Array<{
    waiverId: string;
    targetProviderProjectId: string;
    blockerType: string;
    expiresAt: string;
    waiverScope: string;
    isRevoked?: boolean;
  }>,
  nowIso: string
): WaiverDeltaItemDTO[] {
  const deltas: WaiverDeltaItemDTO[] = [];
  const nowMs = new Date(nowIso).getTime();

  const liveMap = new Map<
    string,
    {
      waiverId: string;
      targetProviderProjectId: string;
      blockerType: string;
      expiresAt: string;
      waiverScope: string;
      isRevoked?: boolean;
    }
  >();

  for (const lw of liveWaivers || []) {
    liveMap.set(lw.waiverId, lw);
  }

  for (const cw of certWaivers || []) {
    const live = liveMap.get(cw.waiverId);
    const certExpiresMs = new Date(cw.expiresAt).getTime();

    if (!live || live.isRevoked) {
      deltas.push({
        waiverId: cw.waiverId,
        targetProviderProjectId: cw.targetProviderProjectId,
        blockerType: cw.blockerType,
        certifiedExpiresAt: cw.expiresAt,
        certifiedWaiverScope: cw.waiverScope,
        deltaType: 'REVOKED_POST_CERTIFICATION',
        explanation: `Certified waiver for ${cw.blockerType} was explicitly revoked or deactivated post-certification.`,
      });
    } else if (nowMs > certExpiresMs || nowMs > new Date(live.expiresAt).getTime()) {
      deltas.push({
        waiverId: cw.waiverId,
        targetProviderProjectId: cw.targetProviderProjectId,
        blockerType: cw.blockerType,
        certifiedExpiresAt: cw.expiresAt,
        liveExpiresAt: live.expiresAt,
        certifiedWaiverScope: cw.waiverScope,
        liveWaiverScope: live.waiverScope,
        deltaType: 'EXPIRED_POST_CERTIFICATION',
        explanation: `Certified waiver for ${cw.blockerType} expired post-certification at ${cw.expiresAt}.`,
      });
    } else if (live.waiverScope !== cw.waiverScope) {
      deltas.push({
        waiverId: cw.waiverId,
        targetProviderProjectId: cw.targetProviderProjectId,
        blockerType: cw.blockerType,
        certifiedExpiresAt: cw.expiresAt,
        liveExpiresAt: live.expiresAt,
        certifiedWaiverScope: cw.waiverScope,
        liveWaiverScope: live.waiverScope,
        deltaType: 'SCOPE_CHANGED',
        explanation: `Waiver scope changed from certified '${cw.waiverScope}' to live '${live.waiverScope}'.`,
      });
    } else {
      deltas.push({
        waiverId: cw.waiverId,
        targetProviderProjectId: cw.targetProviderProjectId,
        blockerType: cw.blockerType,
        certifiedExpiresAt: cw.expiresAt,
        liveExpiresAt: live.expiresAt,
        certifiedWaiverScope: cw.waiverScope,
        liveWaiverScope: live.waiverScope,
        deltaType: 'CARRIED_FORWARD',
        explanation: `Certified waiver remains active and valid in live state until ${cw.expiresAt}.`,
      });
    }
  }

  // Check for newly granted waivers
  const certWaiverIds = new Set((certWaivers || []).map((w) => w.waiverId));
  for (const lw of liveWaivers || []) {
    if (!certWaiverIds.has(lw.waiverId) && !lw.isRevoked) {
      deltas.push({
        waiverId: lw.waiverId,
        targetProviderProjectId: lw.targetProviderProjectId,
        blockerType: lw.blockerType,
        certifiedExpiresAt: 'N/A',
        liveExpiresAt: lw.expiresAt,
        certifiedWaiverScope: 'N/A',
        liveWaiverScope: lw.waiverScope,
        deltaType: 'NEWLY_GRANTED_POST_CERTIFICATION',
        explanation: `New policy waiver granted post-certification for ${lw.blockerType}.`,
      });
    }
  }

  return deltas;
}

/**
 * Computes attestation evidence deltas between certified snapshots and current live attestations
 */
export function diffAttestationsWithLive(
  certAttestations: IAttestationSnapshot[],
  liveAttestations: Array<{
    attestationId: string;
    packageId: string;
    packageName: string;
    fulfillmentStatus: string;
    isStale?: boolean;
  }>
): AttestationDeltaItemDTO[] {
  const deltas: AttestationDeltaItemDTO[] = [];
  const liveMap = new Map<
    string,
    {
      attestationId: string;
      packageId: string;
      packageName: string;
      fulfillmentStatus: string;
      isStale?: boolean;
    }
  >();

  for (const la of liveAttestations || []) {
    liveMap.set(la.attestationId, la);
  }

  for (const ca of certAttestations || []) {
    const live = liveMap.get(ca.attestationId);

    if (!live) {
      deltas.push({
        attestationId: ca.attestationId,
        packageId: ca.packageId,
        packageName: ca.packageName,
        certifiedStatus: ca.fulfillmentStatus,
        deltaType: 'EVIDENCE_REMOVED',
        explanation: `Certified attestation for package '${ca.packageName}' was removed in live state.`,
      });
    } else if (live.isStale) {
      deltas.push({
        attestationId: ca.attestationId,
        packageId: ca.packageId,
        packageName: ca.packageName,
        certifiedStatus: ca.fulfillmentStatus,
        liveStatus: live.fulfillmentStatus,
        deltaType: 'EVIDENCE_STALE',
        explanation: `Attestation for package '${ca.packageName}' is stale due to underlying document updates.`,
      });
    } else {
      deltas.push({
        attestationId: ca.attestationId,
        packageId: ca.packageId,
        packageName: ca.packageName,
        certifiedStatus: ca.fulfillmentStatus,
        liveStatus: live.fulfillmentStatus,
        deltaType: 'EVIDENCE_UNCHANGED',
        explanation: `Fulfillment attestation for package '${ca.packageName}' is active and valid.`,
      });
    }
  }

  // Check for newly added attestations
  const certAttestationIds = new Set((certAttestations || []).map((a) => a.attestationId));
  for (const la of liveAttestations || []) {
    if (!certAttestationIds.has(la.attestationId)) {
      deltas.push({
        attestationId: la.attestationId,
        packageId: la.packageId,
        packageName: la.packageName,
        certifiedStatus: 'N/A',
        liveStatus: la.fulfillmentStatus,
        deltaType: 'EVIDENCE_ADDED',
        explanation: `New fulfillment attestation created post-certification for package '${la.packageName}'.`,
      });
    }
  }

  return deltas;
}

/**
 * Pure Live Compliance Status evaluation based on measured 5-dimensional deltas & system status
 * Tier Precedence: INDETERMINATE_EVIDENCE > NON_COMPLIANT_DRIFT > COMPLIANT_WITH_EXCEPTIONS > FULLY_COMPLIANT
 */
export function evaluateLiveComplianceStatus(params: {
  liveSystemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';
  totalApplicableContracts: number;
  isTruncated?: boolean;
  topologyVarianceCount: number;
  baselineDeltas: BaselineDeltaItemDTO[];
  contractDeltas: ContractDeltaItemDTO[];
  waiverDeltas: WaiverDeltaItemDTO[];
  attestationDeltas: AttestationDeltaItemDTO[];
}): { status: LiveComplianceStatus; reason: string } {
  const {
    liveSystemReleaseStatus,
    totalApplicableContracts,
    isTruncated,
    topologyVarianceCount,
    baselineDeltas,
    contractDeltas,
    waiverDeltas,
    attestationDeltas,
  } = params;

  // 1. INDETERMINATE_EVIDENCE check
  if (liveSystemReleaseStatus === 'INDETERMINATE') {
    return {
      status: 'INDETERMINATE_EVIDENCE',
      reason: 'Live governance gate status is INDETERMINATE due to incomplete baseline or topology records.',
    };
  }

  if (isTruncated) {
    return {
      status: 'INDETERMINATE_EVIDENCE',
      reason: 'Topology subgraph exceeded maximum bounded size limit (50 connected projects). Analytical results truncated.',
    };
  }

  if (totalApplicableContracts === 0 && contractDeltas.length === 0) {
    return {
      status: 'INDETERMINATE_EVIDENCE',
      reason: 'Zero applicable contract specifications found in snapshot or live topology to evaluate.',
    };
  }

  // 2. NON_COMPLIANT_DRIFT check
  if (liveSystemReleaseStatus === 'BLOCKED') {
    return {
      status: 'NON_COMPLIANT_DRIFT',
      reason: 'Current live governance gate status is BLOCKED due to un-waived contract or topology violations.',
    };
  }

  const hasExpiredWaiver = waiverDeltas.some((w) => w.deltaType === 'EXPIRED_POST_CERTIFICATION');
  if (hasExpiredWaiver) {
    return {
      status: 'NON_COMPLIANT_DRIFT',
      reason: 'One or more policy waivers relied upon during certification have expired in live operational state.',
    };
  }

  const hasRevokedWaiver = waiverDeltas.some((w) => w.deltaType === 'REVOKED_POST_CERTIFICATION');
  if (hasRevokedWaiver) {
    return {
      status: 'NON_COMPLIANT_DRIFT',
      reason: 'One or more policy waivers granted during certification were explicitly revoked in live operational state.',
    };
  }

  const hasBreakingContract = contractDeltas.some(
    (c) =>
      c.deltaCode === 'ENDPOINT_REMOVED' ||
      c.deltaCode === 'FIELD_REMOVED' ||
      c.deltaCode === 'FIELD_TYPE_CHANGED' ||
      c.deltaCode === 'FIELD_REQUIREDNESS_CHANGED' ||
      c.deltaCode === 'ENUM_VALUE_REMOVED'
  );
  if (hasBreakingContract) {
    return {
      status: 'NON_COMPLIANT_DRIFT',
      reason: 'Breaking OpenAPI contract modifications detected between certified baselines and current live state.',
    };
  }

  const hasDeactivatedBaseline = baselineDeltas.some(
    (b) => b.deltaType === 'BASELINE_DEACTIVATED' || b.deltaType === 'BASELINE_REPLACED'
  );
  if (hasDeactivatedBaseline) {
    return {
      status: 'NON_COMPLIANT_DRIFT',
      reason: 'Certified baseline deactivated or replaced without authorized continuity.',
    };
  }

  // 3. COMPLIANT_WITH_EXCEPTIONS check
  const hasVersionAdvanced = baselineDeltas.some((b) => b.deltaType === 'VERSION_ADVANCED');
  const hasContractAddition = contractDeltas.some(
    (c) => c.deltaCode === 'ENDPOINT_ADDED' || c.deltaCode === 'ENDPOINT_DEPRECATED'
  );
  const hasCarriedWaiver = waiverDeltas.some(
    (w) => w.deltaType === 'CARRIED_FORWARD' || w.deltaType === 'NEWLY_GRANTED_POST_CERTIFICATION' || w.deltaType === 'SCOPE_CHANGED'
  );
  const hasAttestationChange = attestationDeltas.some(
    (a) => a.deltaType === 'EVIDENCE_ADDED' || a.deltaType === 'EVIDENCE_STALE' || a.deltaType === 'EVIDENCE_REMOVED'
  );

  if (
    topologyVarianceCount > 0 ||
    hasVersionAdvanced ||
    hasContractAddition ||
    hasCarriedWaiver ||
    hasAttestationChange ||
    liveSystemReleaseStatus === 'PASSED_WITH_WAIVER'
  ) {
    return {
      status: 'COMPLIANT_WITH_EXCEPTIONS',
      reason: 'System remains operationally compliant with approved waivers, baseline advancements, or non-breaking variance.',
    };
  }

  // 4. FULLY_COMPLIANT fallback
  return {
    status: 'FULLY_COMPLIANT',
    reason: 'Zero material variance detected across topology, baselines, contracts, waivers, and attestations.',
  };
}

/**
 * Synthesizes deterministic, evidence-backed text explanations for measured variance
 */
export function synthesizeVarianceExplanations(params: {
  topologyDiff: TopologyDiffResult;
  baselineDeltas: BaselineDeltaItemDTO[];
  contractDeltas: ContractDeltaItemDTO[];
  waiverDeltas: WaiverDeltaItemDTO[];
  attestationDeltas: AttestationDeltaItemDTO[];
}): string[] {
  const explanations: string[] = [];

  const { topologyDiff, baselineDeltas, contractDeltas, waiverDeltas, attestationDeltas } = params;

  if (topologyDiff.addedNodes.length > 0) {
    explanations.push(
      `Topology Variance: ${topologyDiff.addedNodes.length} new project node(s) added to live graph since certification (${topologyDiff.addedNodes.map((n) => n.projectName).join(', ')}).`
    );
  }
  if (topologyDiff.removedNodes.length > 0) {
    explanations.push(
      `Topology Variance: ${topologyDiff.removedNodes.length} certified project node(s) removed from live graph (${topologyDiff.removedNodes.map((n) => n.projectName).join(', ')}).`
    );
  }

  for (const bd of baselineDeltas) {
    if (bd.deltaType !== 'UNCHANGED') {
      explanations.push(`Baseline Variance [${bd.projectName}]: ${bd.explanation}`);
    }
  }

  for (const cd of contractDeltas) {
    explanations.push(
      `Contract Variance: ${cd.deltaCode} - ${cd.description}`
    );
  }

  for (const wd of waiverDeltas) {
    if (wd.deltaType !== 'CARRIED_FORWARD') {
      explanations.push(`Waiver Variance [${wd.blockerType}]: ${wd.explanation}`);
    }
  }

  for (const ad of attestationDeltas) {
    if (ad.deltaType !== 'EVIDENCE_UNCHANGED') {
      explanations.push(`Attestation Variance [${ad.packageName}]: ${ad.explanation}`);
    }
  }

  if (explanations.length === 0) {
    explanations.push('No material variance detected between historical certificate snapshot and current live system state.');
  }

  return explanations;
}

/**
 * Synthesizes non-executable, informational next-review considerations
 */
export function synthesizeNextReviewConsiderations(params: {
  complianceStatus: LiveComplianceStatus;
  waiverDeltas: WaiverDeltaItemDTO[];
  contractDeltas: ContractDeltaItemDTO[];
  baselineDeltas: BaselineDeltaItemDTO[];
}): string[] {
  const considerations: string[] = [];
  const { complianceStatus, waiverDeltas } = params;

  if (complianceStatus === 'NON_COMPLIANT_DRIFT') {
    considerations.push(
      'Review expired policy waivers and coordinate with provider teams to restore formal waiver coverage or resolve underlying blockers.'
    );
    considerations.push(
      'Audit breaking OpenAPI contract changes to ensure downstream consumer integrations are updated prior to production release.'
    );
  } else if (complianceStatus === 'COMPLIANT_WITH_EXCEPTIONS') {
    considerations.push(
      'Verify that recent baseline advancements and added API endpoints have complete attestation coverage prior to next release certification.'
    );
    considerations.push(
      'Monitor active carried-forward waivers for upcoming expiration dates to maintain uninterrupted release compliance.'
    );
  } else if (complianceStatus === 'INDETERMINATE_EVIDENCE') {
    considerations.push(
      'Ensure OpenAPI contract specifications are published for all active provider baselines to enable complete automated contract diffing.'
    );
  } else {
    considerations.push(
      'System state is fully aligned with certified release snapshot. No immediate governance action required.'
    );
  }

  const expiringSoon = waiverDeltas.filter((w) => w.deltaType === 'CARRIED_FORWARD');
  if (expiringSoon.length > 0) {
    considerations.push(
      `${expiringSoon.length} active policy waiver(s) carried forward from certification. Review scheduled expiration timestamps.`
    );
  }

  return considerations;
}
