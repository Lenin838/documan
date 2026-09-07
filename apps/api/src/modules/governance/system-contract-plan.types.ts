export type CandidateActionType =
  | 'TECHNICAL_CONTRACT_UPDATE'
  | 'DOCUMENT_CONTENT_UPDATE'
  | 'RELATIONSHIP_UPDATE'
  | 'BASELINE_REFERENCE_UPDATE'
  | 'CONTRACT_AUTHORITY_COMPLETION';

export type ActionRole =
  | 'CONSUMER_ADAPTATION'
  | 'PROVIDER_COMPATIBILITY_RESTORATION'
  | 'COORDINATED_REALIGNMENT'
  | 'AUTHORITY_COMPLETION';

export interface ActionEvidenceDTO {
  sourceProjectId: string;
  targetProjectId: string;
  targetDocumentId: string;
  interoperabilityState: string;
  deltaType?: string | undefined;
  endpointKey?: string | undefined;
  fieldName?: string | undefined;
  reason: string;
  affectedDownstreamDocumentsCount: number;
}

export interface CandidateChangeActionDTO {
  actionId: string; // Ephemeral deterministic ID: "act_1", "act_2"
  actionRole: ActionRole;
  candidateProposalType: 'TECHNICAL_CONTRACT_UPDATE' | 'DOCUMENT_CONTENT_UPDATE' | 'RELATIONSHIP_UPDATE';
  title: string;
  description: string;
  sourceProjectId: string;
  targetProjectId: string;
  targetDocumentId: string;
  targetDocumentTitle: string;
  relevantEvidence: ActionEvidenceDTO;
  proposedChanges: {
    proposedContent?: string | undefined;
    proposedSpecContent?: string | undefined;
    proposedRelationships?: Record<string, unknown>[] | undefined;
  };
  alternativeActionIds: string[]; // Ephemeral IDs of mutually exclusive alternative actions
  prerequisiteActionIds: string[]; // Ephemeral IDs of actions that should precede this action
}

export interface DraftProposalPayloadDTO {
  tempId: string; // "draft_prop_1"
  targetDocumentId: string;
  targetDocumentTitle: string;
  proposalType: 'TECHNICAL_CONTRACT_UPDATE' | 'DOCUMENT_CONTENT_UPDATE' | 'RELATIONSHIP_UPDATE';
  title: string;
  description: string;
  proposedChanges: Record<string, unknown>;
  selectedActionRole: ActionRole;
}

export interface UnresolvedDecisionDTO {
  decisionId: string;
  topic: string;
  description: string;
  alternativeOptions: string[];
}

export interface DraftChangePackagePayloadDTO {
  draftPackageName: string;
  description: string;
  targetProjectId: string;
  candidateProposals: DraftProposalPayloadDTO[];
  recommendedDependencySequence: string[]; // Ordered tempIds
  unresolvedDecisions: UnresolvedDecisionDTO[];
}

export interface SystemContractPlanSummaryDTO {
  totalContractProblems: number;
  candidateActionsCount: number;
  hasAlternatives: boolean;
  isTruncated: boolean;
}

export interface SystemContractPlanResponseDTO {
  targetProjectId: string;
  evaluatedAt: string;
  summary: SystemContractPlanSummaryDTO;
  candidateActions: CandidateChangeActionDTO[];
  dependencyOrderedSequence: string[]; // Ordered actionIds
  draftChangePackage: DraftChangePackagePayloadDTO;
}

export interface ContractChangePlanRequestDTO {
  targetProviderProjectId?: string | undefined;
  severityFilter?: 'ALL' | 'BREAKING_ONLY' | 'MISALIGNED_ONLY' | undefined;
  includeAlternatives?: boolean | undefined;
}
