export type SystemReleaseStatus =
  | 'PASSED'
  | 'PASSED_WITH_WAIVER'
  | 'BLOCKED'
  | 'INDETERMINATE'
  | 'GOVERNANCE_DISABLED';

export type SystemBlockerType =
  | 'CONTRACT_MISALIGNED'
  | 'PROVIDER_ATTESTATION_MISSING'
  | 'PROVIDER_ATTESTATION_STALE'
  | 'PROVIDER_LOCAL_GATE_BLOCKED'
  | 'PROVIDER_GOVERNANCE_DISABLED';

export interface BlockingDependency {
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

export interface SystemGovernanceWaiverDTO {
  _id: string;
  rootProjectId: string;
  targetProviderProjectId: string;
  targetDocumentId?: string | null;
  contractVersionNumber?: number | null;
  blockerType: SystemBlockerType;
  activeScopeKey: string;
  scopeState: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
  reason: string;
  grantedByUserId: string;
  expiresAt: string;
  isRevoked: boolean;
  revokedAt?: string | null;
  revocationReason?: string | null;
  createdAt: string;
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
    waivedBlockers?: number;
    unwaivedBlockers?: number;
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
    appliedWaiverIds?: string[];
    blockingDependencies: BlockingDependency[];
  };
}
