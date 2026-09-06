import { SystemBlockerType } from './system-governance-waiver.model.js';

export type SystemReleaseStatus =
  | 'PASSED'
  | 'PASSED_WITH_WAIVER'
  | 'BLOCKED'
  | 'INDETERMINATE'
  | 'GOVERNANCE_DISABLED';

export interface BlockingDependencyDTO {
  providerProjectId: string;
  providerProjectName: string;
  consumerDocumentTitle: string;
  providerDocumentTitle: string;
  targetDocumentId?: string | null;
  contractVersionNumber?: number | null;
  blockerType: SystemBlockerType;
  reason: string;
  isWaived: boolean;
  appliedWaiverId?: string | null;
  governanceEvidence: {
    providerBaselinePresent: boolean;
    consumerBaselinePresent: boolean;
    providerAttested: boolean;
    attestationStale: boolean;
    providerGovernanceEnabled: boolean;
    providerLocalGateStatus: string;
  };
}

export interface SystemGovernanceGateResult {
  passed: boolean; // Strictly: (systemReleaseStatus === 'PASSED' || systemReleaseStatus === 'PASSED_WITH_WAIVER')
  systemReleaseStatus: SystemReleaseStatus;
  rootProjectId: string;
  evaluatedAt: Date;
  summary: {
    totalDependencies: number;
    alignedDependencies: number;
    misalignedDependencies: number;
    indeterminateDependencies: number;
    blockedProviders: number;
    waivedBlockers: number;
    unwaivedBlockers: number;
  };
  evidence: {
    rootLocalGate: {
      status: 'PASSED' | 'BLOCKED' | 'GOVERNANCE_DISABLED';
      freshnessPercentage: number;
    };
    baselineAlignment: {
      aggregateState: string;
      alignmentScore: number | null;
      evidenceCompleteness: number | null;
    };
    appliedWaiverIds: string[];
    blockingDependencies: BlockingDependencyDTO[];
  };
}
