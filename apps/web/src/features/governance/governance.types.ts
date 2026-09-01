export interface ProjectGovernanceSettings {
  isGovernanceEnabled: boolean;
  maxUnreviewedDays: number;
  autoMarkStaleOnUpstreamChange: boolean;
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
