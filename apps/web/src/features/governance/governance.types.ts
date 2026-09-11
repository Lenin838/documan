export interface ProjectGovernanceSettings {
  isGovernanceEnabled: boolean;
  maxUnreviewedDays: number;
  autoMarkStaleOnUpstreamChange: boolean;
}

export interface ProjectReleaseGateSettings {
  allowStale: boolean;
  allowPendingReviews: boolean;
  allowDeprecated: boolean;
  minFreshnessPercentage: number;
  allowOrphanedApiLinks?: boolean;
  allowDeprecatedApiEndpoints?: boolean;
  allowUnverifiedImpacts?: boolean;
}

export interface ProjectGateToken {
  id: string;
  name: string;
  tokenPrefix: string;
  createdBy: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateGateTokenResponse {
  token: string; // Plaintext token shown ONCE
  id: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface GovernanceHealthMetrics {
  totalDocuments: number;
  eligibleDocuments: number;
  approvedFreshCount: number;
  staleCount: number;
  freshnessPercentage: number;
}

export interface ProjectGovernanceResponse {
  projectId: string;
  governanceSettings: ProjectGovernanceSettings;
  releaseGateSettings: ProjectReleaseGateSettings;
  gateTokens: ProjectGateToken[];
  health: GovernanceHealthMetrics;
}

export interface GovernanceEvaluationResult {
  projectId: string;
  evaluatedDocumentsCount: number;
  staleTransitionsCount: number;
  transitions: Array<{
    documentId: string;
    title: string;
    reason: string;
    rule: 'MAX_UNREVIEWED_DAYS' | 'UPSTREAM_LIFECYCLE_DRIFT';
  }>;
}

export interface ConfirmFreshnessResponse {
  id: string;
  title: string;
  status: string;
  lastReviewedAt: string;
  updatedAt: string;
}

export type LiveComplianceStatus =
  | 'FULLY_COMPLIANT'
  | 'COMPLIANT_WITH_EXCEPTIONS'
  | 'NON_COMPLIANT_DRIFT'
  | 'INDETERMINATE_EVIDENCE';

export interface BaselineDeltaItemDTO {
  projectId: string;
  projectName: string;
  certifiedBaselineId: string;
  certifiedVersionTag: string;
  liveBaselineId?: string;
  liveVersionTag?: string;
  deltaType: string;
  explanation: string;
}

export interface WaiverDeltaItemDTO {
  waiverId: string;
  targetProviderProjectId: string;
  blockerType: string;
  certifiedExpiresAt: string;
  liveExpiresAt?: string;
  certifiedWaiverScope: string;
  liveWaiverScope?: string;
  deltaType: string;
  explanation: string;
}

export interface AttestationDeltaItemDTO {
  attestationId: string;
  packageId: string;
  packageName: string;
  certifiedStatus: string;
  liveStatus?: string;
  deltaType: string;
  explanation: string;
}

export interface ContractDeltaItemDTO {
  deltaCode: string;
  riskTier: string;
  path?: string;
  method?: string;
  fieldPath?: string;
  previousValue?: string;
  newValue?: string;
  description: string;
}

export interface ReleaseCertificateComplianceAuditDTO {
  auditMetadata: {
    certificateId: string;
    releaseTag: string;
    certifiedAt: string;
    auditTimestamp: string;
    rootProjectId: string;
    certificateStatus: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
    certifiedSystemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
    liveSystemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';
    matchesCertifiedState: boolean;
    isIntegrityVerified: boolean;
  };
  complianceStatus: LiveComplianceStatus;
  complianceReason?: string;
  varianceExplanations: string[];
  nextReviewConsiderations: string[];
  varianceSummary: {
    topologyVarianceCount: number;
    baselineVarianceCount: number;
    contractVarianceCount: number;
    waiverVarianceCount: number;
    attestationVarianceCount: number;
  };
  topologyDeltas: {
    addedNodes: Array<{ projectId: string; projectName: string }>;
    removedNodes: Array<{ projectId: string; projectName: string }>;
    addedEdges: Array<{ sourceProjectId: string; targetProjectId: string; linkType: string }>;
    removedEdges: Array<{ sourceProjectId: string; targetProjectId: string; linkType: string }>;
  };
  baselineDeltas: BaselineDeltaItemDTO[];
  contractDeltas: ContractDeltaItemDTO[];
  waiverDeltas: WaiverDeltaItemDTO[];
  attestationDeltas: AttestationDeltaItemDTO[];
}
