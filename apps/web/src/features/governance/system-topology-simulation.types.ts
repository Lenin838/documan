import type { SystemReleaseStatus, BlockingDependency, SystemBlockerType } from './system-topology-governance-gate.types';

export type SimulationStatus = 'COMPLETE' | 'TRUNCATED_PARTIAL' | 'INDETERMINATE' | 'UNSUPPORTED';

export interface ProposedBaselineOverlay {
  providerProjectId: string;
  targetDocumentId: string;
  versionNumber: number;
}

export interface ProposedAttestationOverlay {
  providerProjectId: string;
  changePackageId?: string;
  attestationVersion: number;
}

export interface CandidateWaiverOverlay {
  targetProviderProjectId: string;
  targetDocumentId?: string | null;
  contractVersionNumber?: number | null;
  blockerType: SystemBlockerType;
  reason: string;
  expiresInDays?: number;
}

export interface ProposedTopologyLinkOverlay {
  targetProjectId: string;
  dependencyType: 'DEPENDS_ON' | 'REFERENCES';
  action: 'ADD' | 'REMOVE';
}

export interface SystemTopologySimulationScenarioInput {
  rootProjectId: string;
  proposedBaselines?: ProposedBaselineOverlay[];
  proposedAttestations?: ProposedAttestationOverlay[];
  candidateWaivers?: CandidateWaiverOverlay[];
  proposedTopologyLinks?: ProposedTopologyLinkOverlay[];
}

export interface SystemTopologySimulationDelta {
  statusChanged: boolean;
  baselineStatus: SystemReleaseStatus;
  simulatedStatus: SystemReleaseStatus;
  previousBlockerCount: number;
  newBlockerCount: number;
  resolvedBlockerCount: number;
  newUnwaivedBlockers: number;
  newlyWaivedBlockers: number;
}

export interface SystemTopologySimulationResponse {
  simulationId?: string;
  simulationStatus: SimulationStatus;
  isSimulated: true;
  evaluatedAt: string;
  rootProjectId: string;
  baselineResult: {
    systemReleaseStatus: SystemReleaseStatus;
    summary: {
      totalDependencies: number;
      alignedDependencies: number;
      misalignedDependencies: number;
      indeterminateDependencies: number;
      blockedProviders: number;
      waivedBlockers: number;
      unwaivedBlockers: number;
    };
    blockingDependencies: BlockingDependency[];
  };
  simulatedResult: {
    systemReleaseStatus: SystemReleaseStatus;
    summary: {
      totalDependencies: number;
      alignedDependencies: number;
      misalignedDependencies: number;
      indeterminateDependencies: number;
      blockedProviders: number;
      waivedBlockers: number;
      unwaivedBlockers: number;
    };
    blockingDependencies: BlockingDependency[];
  };
  delta: SystemTopologySimulationDelta;
}
