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
  summary?: string;
  state: DerivedEvidenceState;
  stateReason: string;
  sourceId: string;
  targetId?: string;
  sourceVersion?: number;
  targetVersion?: number;
  verifiedBy?: UserProvenanceSummary | null;
  verifiedAt?: string | null;
  lastAuditAction?: string;
  metadata?: Record<string, unknown>;
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

export interface EvidenceCoverageResponse {
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

export interface SourceDocumentSummary {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  status: string;
  version: number;
  lastApprovedVersion?: number | null;
  relationshipType?: string;
}

export interface ReverseEndpointResponse {
  endpointId: string;
  method: string;
  path: string;
  summary?: string;
  citingDocuments: SourceDocumentSummary[];
}

export interface ReverseDocumentResponse {
  targetDocumentId: string;
  targetTitle: string;
  citingDocuments: SourceDocumentSummary[];
}

export interface ReverseReferenceResponse {
  url: string;
  citingDocuments: SourceDocumentSummary[];
}
