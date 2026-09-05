/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DocumentChangeProposal } from '../change-proposals/change-proposal.types';

export type PackageStatus =
  | 'DRAFT'
  | 'SIMULATED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DISCARDED';

export interface PackageConflict {
  conflictClass:
    | 'MUTUALLY_EXCLUSIVE_TARGET'
    | 'CONTRADICTORY_RELATIONSHIP'
    | 'DEPRECATION_DEPENDENCY_CONFLICT'
    | 'CIRCULAR_DEPENDENCY_INJECTION'
    | 'INCOMPATIBLE_CONTRACT_SCHEMA';
  description: string;
  contributingProposalIds: string[];
  severity: 'BLOCKING' | 'WARNING';
}

export interface ImpactDetail {
  category: 'RELATIONSHIP_IMPACT' | 'EVIDENCE_IMPACT' | 'BASELINE_IMPACT' | 'VERIFICATION_IMPACT' | 'TOPOLOGY_IMPACT';
  sourceProposalId: string;
  edgeKey?: string;
  description: string;
}

export interface DeduplicatedImpactedDocument {
  documentId: string;
  title: string;
  projectId: string;
  minDepth: number;
  contributingProposalIds: string[];
  impactDetails: ImpactDetail[];
}

export interface PackageSimulationResultDTO {
  simulationStatus: 'COMPLETE' | 'TRUNCATED_PARTIAL' | 'INDETERMINATE' | 'UNSUPPORTED';
  simulatedAt: string;
  packageId: string;
  projectId: string;
  conflicts: PackageConflict[];
  predictedState: {
    predictedJointGateStatus: 'PASSED' | 'WARNING' | 'FAILED' | 'GOVERNANCE_DISABLED';
    predictedDriftStatus: 'IN_SYNC' | 'DRIFTED' | 'NO_BASELINE';
    predictedEvidenceScore: number;
    impactCascade: {
      totalImpactedCount: number;
      maxDepthReached: number;
      isTruncated: boolean;
      impactedDocuments: DeduplicatedImpactedDocument[];
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
      contributingProposalIds: string[];
    }>;
  };
}

export interface DocumentChangePackage {
  _id: string;
  packageNumber: string;
  projectId: string;
  title: string;
  description?: string;
  proposals: Array<string | DocumentChangeProposal>;
  status: PackageStatus;
  createdBy: any;
  reviewedBy?: any;
  reviewComment?: string;
  lastSimulatedAt?: string;
  packageStateFingerprint?: string;
  lastSimulationStatus?: string;
  simulationResultCache?: PackageSimulationResultDTO;
  createdAt: string;
  updatedAt: string;
}

export interface PackageStalenessResult {
  isStale: boolean;
  packageFingerprint: string;
  proposalStaleness: Array<{
    proposalId: string;
    proposalNumber: string;
    targetDocumentId: string;
    isStale: boolean;
    reason?: string;
  }>;
}
