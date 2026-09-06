export type ContractDeltaCode =
  | 'ENDPOINT_REMOVED'
  | 'ENDPOINT_DEPRECATED'
  | 'FIELD_REMOVED'
  | 'FIELD_TYPE_CHANGED'
  | 'FIELD_REQUIREDNESS_CHANGED'
  | 'ENUM_VALUE_REMOVED'
  | 'ENDPOINT_ADDED';

export type RiskTier = 'BREAKING' | 'WARNING' | 'NON_BREAKING';

export interface ContractDeltaItemDTO {
  deltaCode: ContractDeltaCode;
  riskTier: RiskTier;
  path?: string;
  method?: string;
  fieldPath?: string;
  previousValue?: string;
  newValue?: string;
  description: string;
}

export interface TopologicalBlastRadiusDTO {
  affectedProjectsCount: number;
  reachableProjectsCount: number;
  projectBlastRadiusRatio: number | null;
  affectedDocumentsCount: number;
  reachableDocumentsCount: number;
  documentBlastRadiusRatio: number | null;
  maximumDependencyDepth: number;
  isTruncated: boolean;
  truncationReason?: string | null;
}

export interface ContractEvolutionImpactImplicationsDTO {
  alignmentConsequence: 'MISALIGNED';
  governanceConsequence: 'BLOCKED' | 'PASSED_WITH_WAIVER';
  assuranceConsequence: 'STALE' | 'BLOCKED';
  implicatedVerificationCategories: string[];
}

export interface ContractEvolutionImpactItemDTO {
  depth: number;
  consumerProjectId: string;
  consumerProjectName: string;
  consumerDocumentId: string;
  consumerDocumentTitle: string;
  consumerReferencedVersion: number;
  impactCategory: 'DIRECT_BREAKING_CONTRACT' | 'TRANSITIVE_DEPENDENCY_DRIFT';
  implications: ContractEvolutionImpactImplicationsDTO;
}

export interface ContractEvolutionBaselineInfoDTO {
  baselineId: string;
  version: string;
  createdAt: string;
}

export interface ContractEvolutionDeltaResponseDTO {
  providerProjectId: string;
  providerBaselineA?: ContractEvolutionBaselineInfoDTO;
  providerBaselineB?: ContractEvolutionBaselineInfoDTO;
  analysisStatus: 'COMPLETE' | 'UNSUPPORTED_CONTRACT_STRUCTURE' | 'INDETERMINATE_HISTORICAL_EVIDENCE';
  unsupportedReason?: string;
  contractDeltas: ContractDeltaItemDTO[];
  blastRadius: TopologicalBlastRadiusDTO;
  dependencyOrderedImpactSequence: ContractEvolutionImpactItemDTO[];
}
