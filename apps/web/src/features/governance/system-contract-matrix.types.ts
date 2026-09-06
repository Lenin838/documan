export type InteroperabilityState =
  | 'NO_RELEVANT_CONTRACT_DEPENDENCY'
  | 'MISSING_AUTHORITATIVE_CONTRACT'
  | 'UNSUPPORTED_CONTRACT'
  | 'BREAKING_CONTRACT_DELTA'
  | 'STRUCTURALLY_MISALIGNED'
  | 'ALIGNED'
  | 'INDETERMINATE';

export type SystemContractMatrixOverallStatus =
  | 'FULL_COMPATIBILITY'
  | 'PARTIAL_MISALIGNMENT'
  | 'BREAKING_INCOMPATIBILITY'
  | 'INDETERMINATE';

export type CrossProjectRelationshipType =
  | 'CONSUMER_TO_PROVIDER'
  | 'PROVIDER_TO_CONSUMER'
  | 'BIDIRECTIONAL'
  | 'NONE';

export interface InteroperabilityCellDTO {
  rowProjectId: string;
  rowProjectName: string;
  colProjectId: string;
  colProjectName: string;
  relationshipType: CrossProjectRelationshipType;
  interoperabilityState: InteroperabilityState;
  precedenceTier: number;
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
  interoperabilityState: InteroperabilityState;
  activeProviderBaselineVersion: string | null;
  referencedConsumerBaselineVersion: string | null;
  remediationAction: string;
}

export interface SystemContractMatrixResponseDTO {
  evaluatedAt: string;
  rootProjectId: string;
  rootProjectName: string;
  overallStatus: SystemContractMatrixOverallStatus;
  matrixDimensions: string;
  authorizedProjectCount: number;
  activeBaselineCoveragePercentage: number;
  alignedPairPercentage: number;
  isTruncated: boolean;
  projectHeaders: Array<{
    projectId: string;
    name: string;
  }>;
  matrix: InteroperabilityCellDTO[][];
  criticalIncompatibilities: CriticalIncompatibilityItemDTO[];
}
