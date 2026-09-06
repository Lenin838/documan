export type SystemReleaseStatus = 'PASSED' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';

export interface BlockingDependency {
  providerProjectId: string;
  providerProjectName: string;
  consumerDocumentTitle: string;
  providerDocumentTitle: string;
  reason: string;
  governanceEvidence: {
    providerBaselinePresent: boolean;
    consumerBaselinePresent: boolean;
    providerAttested: boolean;
    attestationStale: boolean;
    providerGovernanceEnabled: boolean;
    providerLocalGateStatus: string;
  };
}

export interface SystemGovernanceGateResponse {
  passed: boolean;
  systemReleaseStatus: SystemReleaseStatus;
  rootProjectId: string;
  evaluatedAt: string;
  summary: {
    totalDependencies: number;
    alignedDependencies: number;
    misalignedDependencies: number;
    indeterminateDependencies: number;
    blockedProviders: number;
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
    blockingDependencies: BlockingDependency[];
  };
}
