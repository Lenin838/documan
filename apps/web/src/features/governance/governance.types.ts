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
