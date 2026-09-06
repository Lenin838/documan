export type SystemReleaseStatus = 'PASSED' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';

export interface BlockingDependencyDTO {
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

export interface SystemGovernanceGateResult {
  passed: boolean; // Strictly: (systemReleaseStatus === 'PASSED')
  systemReleaseStatus: SystemReleaseStatus;
  rootProjectId: string;
  evaluatedAt: Date;
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
    blockingDependencies: BlockingDependencyDTO[];
  };
}
