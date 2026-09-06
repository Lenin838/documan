/**
 /**
 * Matrix Cell Interoperability State Taxonomy
 * Precedence Tier (1 = Highest Priority, 6 = Lowest Priority):
 * 1. NO_RELEVANT_CONTRACT_DEPENDENCY (Precedence 1)
 * 2. MISSING_AUTHORITATIVE_CONTRACT (Precedence 2)
 * 3. UNSUPPORTED_CONTRACT (Precedence 3)
 * 4. BREAKING_CONTRACT_DELTA (Precedence 4)
 * 5. STRUCTURALLY_MISALIGNED (Precedence 5)
 * 6. ALIGNED (Precedence 6)
 * NOT_APPLICABLE (Diagonal cell self-reference)
 */
export type MatrixCellInteroperabilityState =
  | 'NO_RELEVANT_CONTRACT_DEPENDENCY'
  | 'MISSING_AUTHORITATIVE_CONTRACT'
  | 'UNSUPPORTED_CONTRACT'
  | 'BREAKING_CONTRACT_DELTA'
  | 'STRUCTURALLY_MISALIGNED'
  | 'ALIGNED'
  | 'NOT_APPLICABLE';

export type MatrixCellRelationshipType =
  | 'CONSUMER_TO_PROVIDER'
  | 'PROVIDER_TO_CONSUMER'
  | 'MUTUAL'
  | 'NONE';

export interface MatrixCellDTO {
  rowProjectId: string;
  rowProjectName: string;
  colProjectId: string;
  colProjectName: string;
  relationshipType: MatrixCellRelationshipType;
  interoperabilityState: MatrixCellInteroperabilityState;
  precedenceTier: number; // 1 to 6
  contractCount: number;
  alignedContractCount: number;
  misalignedContractCount: number;
  breakingDeltaCount: number;
  activeProviderBaselineVersion: string | null;
  referencedConsumerBaselineVersion: string | null;
  indeterminacyReason: string | null;
  remediationAction: string | null;
}

export interface CriticalIncompatibilityItemDTO {
  consumerProjectId: string;
  consumerProjectName: string;
  providerProjectId: string;
  providerProjectName: string;
  documentId: string;
  documentTitle: string;
  issueType: 'BREAKING_SCHEMA_DELTA' | 'STRUCTURAL_BASELINE_MISALIGNMENT' | 'MISSING_PROVIDER_CONTRACT' | 'UNSUPPORTED_CONTRACT_STRUCTURE';
  description: string;
  remediationText: string;
}

export interface SystemContractMatrixResponseDTO {
  evaluationTimestamp: string;
  rootProjectId: string;
  rootProjectName: string;
  authorizedProjectCount: number;
  matrixDimensions: string; // e.g. "4x4"
  interoperabilityIndex: number; // 0-100%
  overallStatus: 'FULLY_ALIGNED' | 'PARTIAL_MISALIGNMENT' | 'BREAKING_DELTAS_DETECTED' | 'NO_CONTRACTS';
  isTruncated: boolean;
  projectHeaders: Array<{ projectId: string; name: string }>;
  matrix: MatrixCellDTO[][];
  criticalIncompatibilities: CriticalIncompatibilityItemDTO[];
}
