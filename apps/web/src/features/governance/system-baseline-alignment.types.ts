export type AlignmentUnitState = 'ALIGNED' | 'MISALIGNED' | 'INDETERMINATE';

export type IndeterminacyReason =
  | 'MISSING_PROVIDER_BASELINE'
  | 'MISSING_CONSUMER_BASELINE'
  | 'MISSING_CONSUMER_SNAPSHOT'
  | 'UNSUPPORTED_CONDITION';

export type AggregateAlignmentState =
  | 'ALIGNED'
  | 'PARTIALLY_ALIGNED'
  | 'MISALIGNED'
  | 'INDETERMINATE'
  | 'ZERO_APPLICABLE_EVIDENCE';

export interface GovernanceEvidenceDTO {
  providerBaselinePresent: boolean;
  consumerBaselinePresent: boolean;
  consumerSnapshotPresent: boolean;
  providerAttested: boolean;
  attestationStale: boolean;
  attestationVersion?: number | null;
  changePackageId?: string | null;
  attestedAt?: string | null;
}

export interface ProjectRefSummary {
  id: string;
  name: string;
}

export interface DocumentRefSummary {
  id: string;
  title: string;
}

export interface VersionRefSummary {
  versionNumber: number;
  checksum: string;
}

export interface AlignmentUnitDTO {
  unitId: string;
  consumerProject: ProjectRefSummary;
  providerProject: ProjectRefSummary;
  consumerDocument: DocumentRefSummary;
  providerDocument: DocumentRefSummary;
  consumerVersionRef?: VersionRefSummary | null;
  providerActiveVersion?: VersionRefSummary | null;
  alignmentState: AlignmentUnitState;
  indeterminacyReason?: IndeterminacyReason | null;
  governanceEvidence: GovernanceEvidenceDTO;
}

export interface AlignmentSummaryDTO {
  totalUnits: number;
  applicableUnits: number;
  evaluableUnits: number;
  alignedUnits: number;
  misalignedUnits: number;
  indeterminateUnits: number;
}

export interface SystemBaselineAlignmentResponse {
  projectId: string;
  evaluatedAt: string;
  aggregateState: AggregateAlignmentState;
  alignmentScore: number | null;
  evidenceCompleteness: number | null;
  summary: AlignmentSummaryDTO;
  alignmentUnits: AlignmentUnitDTO[];
}
