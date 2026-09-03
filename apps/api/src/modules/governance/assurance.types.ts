export type AssuranceStatus = 'READY' | 'WARNING' | 'BLOCKED' | 'GOVERNANCE_DISABLED';

export type CheckSeverity = 'BLOCKING' | 'WARNING' | 'INFO';

export type CheckStatus = 'PASSED' | 'FAILED' | 'WARNING' | 'WAIVED' | 'NOT_APPLICABLE';

export type AssuranceDimensionCategory =
  | 'EVIDENCE_INTEGRITY'
  | 'UPSTREAM_FRESHNESS'
  | 'API_DRIFT'
  | 'GOVERNANCE_FRESHNESS'
  | 'HUMAN_APPROVAL'
  | 'STEWARDSHIP'
  | 'KNOWLEDGE_RISK';

export interface AssuranceRemediation {
  code: string;
  label: string;
  detail: string;
}

export interface GovernanceWaiverSummary {
  checkId: string;
  reason: string;
  grantedBy: {
    id: string;
    name: string;
  };
  grantedAt: Date;
  expiresAt: Date;
  documentVersion: number;
  isExpired: boolean;
  isVersionInvalidated: boolean;
}

export interface AssuranceCheckResult {
  checkId: string;
  name: string;
  category: AssuranceDimensionCategory;
  severity: CheckSeverity;
  status: CheckStatus;
  isWaivable: boolean;
  actualValue: string;
  expectedValue: string;
  reason: string;
  remediation?: AssuranceRemediation | undefined;
  waiver?: GovernanceWaiverSummary | undefined;
}

export interface DocumentAssuranceResult {
  documentId: string;
  evaluatedAction: 'APPROVAL_RELEASE_READINESS';
  status: AssuranceStatus;
  evaluatedAt: Date;
  summary: {
    totalChecks: number;
    passedCount: number;
    warningCount: number;
    failedCount: number;
    waivedCount: number;
  };
  checks: AssuranceCheckResult[];
  blockingReasons: string[];
  warnings: string[];
  remediations: AssuranceRemediation[];
  activeWaivers: GovernanceWaiverSummary[];
}

export interface AssuranceCalculatorContext {
  document: {
    id: string;
    title: string;
    status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DEPRECATED' | 'STALE';
    version: number;
    lastApprovedVersion?: number | null | undefined;
    createdAt: Date;
    lastReviewedAt?: Date | null | undefined;
    ownerId?: string | null | undefined;
    stewardId?: string | null | undefined;
    impactVerification?: {
      needsVerification?: boolean;
      activeImpactSources?: Array<{ upstreamDocumentId: string; upstreamVersionNumber: number }>;
    } | null | undefined;
  };
  project?: {
    id: string;
    name: string;
    governanceSettings?: {
      isGovernanceEnabled: boolean;
      maxUnreviewedDays: number;
    };
    releaseGateSettings?: {
      allowStale: boolean;
      allowPendingReviews: boolean;
      allowDeprecated: boolean;
      minFreshnessPercentage: number;
      allowOrphanedApiLinks?: boolean;
      allowDeprecatedApiEndpoints?: boolean;
      allowUnverifiedImpacts?: boolean;
    };
  } | null | undefined;
  reviews?: Array<{
    id: string;
    status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'CANCELLED';
  }>;
  waiverEvents?: Array<{
    action: 'GOVERNANCE_WAIVER_GRANTED' | 'GOVERNANCE_WAIVER_REVOKED';
    metadata?: Record<string, unknown> | undefined;
    user?: { id: string; name: string } | undefined;
    createdAt: Date;
  }>;
  evidenceCoverage?: {
    coverageScore: number;
    orphanedCount: number;
    staleCount: number;
  } | null | undefined;
  knowledgeRisk?: {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    effectiveContact?: { id: string; name: string; isActive?: boolean } | null | undefined;
  } | null | undefined;
  now?: Date;
}
