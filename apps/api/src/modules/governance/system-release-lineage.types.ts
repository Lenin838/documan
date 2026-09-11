import type { ContractDeltaItemDTO } from './system-contract-evolution.types.js';

export interface CompareReleaseCertificatesRequestDTO {
  sourceCertificateId: string;
  targetCertificateId: string;
}

export interface ComparisonMetadataDTO {
  sourceCertificateId: string;
  sourceReleaseTag: string;
  sourceCertifiedAt: string;
  targetCertificateId: string;
  targetReleaseTag: string;
  targetCertifiedAt: string;
  rootProjectId: string;
  comparisonDirection: 'FORWARD' | 'BACKWARD';
  isSourceRevoked: boolean;
  isTargetRevoked: boolean;
  isSourceSuperseded: boolean;
  isTargetSuperseded: boolean;
  supersessionPathDistance: number | null;
}

export interface TrajectorySummaryDTO {
  classification: 'IMPROVED' | 'STABLE' | 'DEGRADED' | 'INDETERMINATE';
  deltaAlignmentScore: number | null;
  deltaWaiverCount: number;
  deltaAttestationCount: number;
  hasBreakingContractDeltas: boolean;
  evaluationStatus: 'COMPLETE' | 'PARTIAL' | 'INDETERMINATE' | 'UNSUPPORTED';
  statusReason?: string;
}

export interface TopologyNodeDeltaDTO {
  projectId: string;
  projectName: string;
  deltaType: 'ADDED' | 'REMOVED' | 'UNCHANGED';
}

export interface TopologyEdgeDeltaDTO {
  sourceProjectId: string;
  targetProjectId: string;
  linkType: string;
  deltaType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
}

export interface TopologyDeltaDTO {
  addedNodes: TopologyNodeDeltaDTO[];
  removedNodes: TopologyNodeDeltaDTO[];
  unchangedNodes: TopologyNodeDeltaDTO[];
  addedEdges: TopologyEdgeDeltaDTO[];
  removedEdges: TopologyEdgeDeltaDTO[];
  unchangedEdges: TopologyEdgeDeltaDTO[];
}

export interface BaselineDeltaItemDTO {
  projectId: string;
  projectName: string;
  sourceVersionTag?: string;
  targetVersionTag?: string;
  sourceBaselineId?: string;
  targetBaselineId?: string;
  deltaType:
    | 'ADDED_BASELINE'
    | 'REMOVED_BASELINE'
    | 'VERSION_ADVANCED'
    | 'VERSION_REGRESSED'
    | 'UNCHANGED_BASELINE'
    | 'INDETERMINATE_BASELINE';
}

export interface WaiverDeltaItemDTO {
  waiverId?: string;
  targetProviderProjectId: string;
  blockerType: string;
  targetDocumentId?: string;
  waiverScope?: string;
  deltaType:
    | 'NEWLY_GRANTED'
    | 'RESOLVED'
    | 'CARRIED_FORWARD'
    | 'EXPIRED_POST_CERTIFICATION'
    | 'SCOPE_CHANGED';
}

export interface AttestationDeltaItemDTO {
  attestationId?: string;
  packageId: string;
  packageName: string;
  fulfillmentStatus?: string;
  deltaType:
    | 'EVIDENCE_ADDED'
    | 'EVIDENCE_REMOVED'
    | 'EVIDENCE_UNCHANGED'
    | 'EVIDENCE_INDETERMINATE';
}

export interface SystemReleaseDifferentialDTO {
  comparisonMetadata: ComparisonMetadataDTO;
  trajectory: TrajectorySummaryDTO;
  topologyDeltas: TopologyDeltaDTO;
  baselineDeltas: BaselineDeltaItemDTO[];
  contractDeltas: ContractDeltaItemDTO[];
  waiverDeltas: WaiverDeltaItemDTO[];
  attestationDeltas: AttestationDeltaItemDTO[];
}

export interface SupersessionLineageNodeDTO {
  certificateId: string;
  releaseTag: string;
  certifiedAt: string;
  certificateStatus: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
  systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
  supersedesCertificateId?: string;
  depth: number;
}

export interface SupersessionLineageGraphDTO {
  rootProjectId: string;
  headCertificateId: string;
  lineageNodes: SupersessionLineageNodeDTO[];
  traversalMetadata: {
    totalNodesTraversed: number;
    maxDepthReached: boolean;
    hasCycleDetected: boolean;
    hasMissingParent: boolean;
    status: 'COMPLETE' | 'PARTIAL' | 'INDETERMINATE';
  };
}
