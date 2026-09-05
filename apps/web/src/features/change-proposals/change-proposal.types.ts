/* eslint-disable @typescript-eslint/no-explicit-any */
export type ProposalType =
  | 'DOCUMENT_CONTENT_UPDATE'
  | 'TECHNICAL_CONTRACT_UPDATE'
  | 'RELATIONSHIP_UPDATE'
  | 'DEPRECATION_PROPOSAL';

export type ProposalStatus =
  | 'DRAFT'
  | 'SIMULATED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DISCARDED';

export interface ProposedRelationshipOperation {
  operation: 'ADD_RELATIONSHIP' | 'REMOVE_RELATIONSHIP';
  targetDocumentId: string;
  type: 'RELATED' | 'REFERENCES' | 'REPLACES' | 'DEPENDS_ON';
  description?: string;
}

export interface ProposedChangePayload {
  title?: string;
  content?: string;
  changeDescription?: string;
  contractSchema?: Record<string, any>;
  targetVersionType?: 'MAJOR' | 'MINOR' | 'PATCH';
  relationshipOperations?: ProposedRelationshipOperation[];
}

export interface SimulationResult {
  simulationStatus: 'COMPLETE' | 'TRUNCATED_PARTIAL' | 'INDETERMINATE' | 'UNSUPPORTED';
  simulatedAt: string;
  targetDocumentId: string;
  projectId: string;
  authoritativeState: {
    title: string;
    version: number;
    status: string;
    checksum: string;
    hasActiveBaseline: boolean;
    gateStatus: string;
  };
  predictedState: {
    predictedVersion: string;
    predictedChecksum?: string;
    predictedGateStatus: 'PASSED' | 'WARNING' | 'FAILED' | 'GOVERNANCE_DISABLED';
    predictedDriftStatus: 'IN_SYNC' | 'DRIFTED' | 'NO_BASELINE';
    predictedDriftDimensions: string[];
    predictedEvidenceScore: number;
    predictedEvidenceStatus: string;
    impactCascade: {
      totalImpactedCount: number;
      maxDepthReached: number;
      isTruncated: boolean;
      impactedDocuments: Array<{
        documentId: string;
        title: string;
        projectId: string;
        depth: number;
      }>;
    };
    predictedCrossProjectBlastRadius: {
      impactedProjectsCount: number;
      crossProjectNodes: Array<{
        projectId: string;
        projectName: string;
      }>;
    };
    predictedVerificationTasks: Array<{
      taskType: string;
      priority: string;
      targetDocumentId: string;
      description: string;
    }>;
    affectedExistingWorkRequests: Array<{
      requestId: string;
      title: string;
      status: string;
    }>;
    predictedWorkTasks: Array<{
      title: string;
      category: string;
      description: string;
    }>;
  };
  warnings: string[];
}

export interface DocumentChangeProposal {
  _id: string;
  proposalNumber: string;
  projectId: string;
  targetDocumentId: {
    _id: string;
    title: string;
    version: number;
    status: string;
  } | string;
  title: string;
  description?: string;
  proposalType: ProposalType;
  proposedChange: ProposedChangePayload;
  status: ProposalStatus;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  } | string;
  reviewedBy?: string;
  reviewComment?: string;
  lastSimulatedAt?: string;
  simulationStateFingerprint?: string;
  lastSimulationStatus?: string;
  simulationResultCache?: SimulationResult;
  acceptedAuthoritativeVersionId?: string;
  createdAt: string;
  updatedAt: string;
}
