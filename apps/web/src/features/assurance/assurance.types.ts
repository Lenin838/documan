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
  grantedAt: string;
  expiresAt: string;
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
  remediation?: AssuranceRemediation;
  waiver?: GovernanceWaiverSummary;
}

export interface DocumentAssuranceResult {
  documentId: string;
  evaluatedAction: 'APPROVAL_RELEASE_READINESS';
  status: AssuranceStatus;
  evaluatedAt: string;
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
