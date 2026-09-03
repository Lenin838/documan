export type DerivedEvidenceState = 'VERIFIED' | 'STALE' | 'ORPHANED' | 'UNVERIFIED';

export type EvidenceCategory =
  | 'API_ENDPOINT'
  | 'DOCUMENT_DEPENDENCY'
  | 'EXTERNAL_REFERENCE'
  | 'VERSION_SNAPSHOT'
  | 'GOVERNANCE_REVIEW';

export interface UserProvenanceSummary {
  id: string;
  name: string;
}

export interface DerivedEvidenceItem {
  syntheticId: string;
  category: EvidenceCategory;
  title: string;
  summary?: string | undefined;
  state: DerivedEvidenceState;
  stateReason: string;
  sourceId: string;
  targetId?: string | undefined;
  sourceVersion?: number | undefined;
  targetVersion?: number | undefined;
  verifiedBy?: UserProvenanceSummary | null | undefined;
  verifiedAt?: Date | null | undefined;
  lastAuditAction?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface RemediationItem {
  code: string;
  label: string;
  detail: string;
}

export type EvidenceCoverageLabel =
  | 'EXCELLENT'
  | 'GOOD'
  | 'NEEDS_ATTENTION'
  | 'POOR'
  | 'NO_APPLICABLE_EVIDENCE';

export interface EvidenceCoverageResult {
  documentId: string;
  coverageScore: number;
  label: EvidenceCoverageLabel;
  applicableCount: number;
  verifiedCount: number;
  staleCount: number;
  orphanedCount: number;
  unverifiedCount: number;
  items: DerivedEvidenceItem[];
  remediations: RemediationItem[];
}

export interface ActiveImpactSourceContext {
  upstreamDocumentId: string;
  upstreamVersionNumber?: number | null | undefined;
  changeType: 'STALE' | 'DEPRECATED' | 'FILE_REPLACED';
  flaggedAt: Date;
}

export interface LinkedEndpointContext {
  linkId: string;
  endpointId: string;
  method: string;
  path: string;
  summary?: string | undefined;
  status: 'LINKED' | 'ORPHANED';
  isDeprecated?: boolean | undefined;
}

export interface DependencyRelationContext {
  relationshipId: string;
  targetDocumentId: string;
  targetTitle: string;
  type: 'DEPENDS_ON' | 'REFERENCES' | 'REPLACES' | 'RELATED';
  targetStatus: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DEPRECATED' | 'STALE';
  targetVersion?: number | undefined;
  isDeleted: boolean;
}

export interface ExternalReferenceContext {
  referenceId: string;
  title: string;
  type: string;
  url: string;
}

export interface DocumentVersionContext {
  versionNumber: number;
  createdAt: Date;
  createdById: string;
  createdByName: string;
}

export interface GovernanceReviewContext {
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DEPRECATED' | 'STALE';
  currentVersion: number;
  lastApprovedVersion?: number | null | undefined;
  lastReviewedAt?: Date | null | undefined;
  createdAt: Date;
  isGovernanceEnabled?: boolean | undefined;
  maxUnreviewedDays?: number | null | undefined;
  stewardUser?: UserProvenanceSummary | null | undefined;
  ownerUser?: UserProvenanceSummary | null | undefined;
}

export interface EvidenceCoverageContext {
  documentId: string;
  documentTitle: string;
  currentVersion: number;
  lastApprovedVersion?: number | null | undefined;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DEPRECATED' | 'STALE';
  needsVerification?: boolean | undefined;
  activeImpactSources?: ActiveImpactSourceContext[] | undefined;
  endpoints?: LinkedEndpointContext[] | undefined;
  dependencies?: DependencyRelationContext[] | undefined;
  references?: ExternalReferenceContext[] | undefined;
  versions?: DocumentVersionContext[] | undefined;
  governance?: GovernanceReviewContext | null | undefined;
  evaluationAt: Date;
}
