import { SystemBlockerType } from './system-governance-waiver.model.js';
import type { SystemReleaseStatus, BlockingDependencyDTO } from './system-topology-governance-gate.types.js';

export interface ProposedBaselineInput {
  providerProjectId: string;
  targetDocumentId: string;
  versionNumber: number;
}

export interface ProposedAttestationInput {
  providerProjectId: string;
  changePackageId?: string | undefined;
  attestationVersion: number;
}

export interface CandidateWaiverInput {
  targetProviderProjectId: string;
  targetDocumentId?: string | null | undefined;
  contractVersionNumber?: number | null | undefined;
  blockerType: SystemBlockerType;
  reason: string;
  expiresInDays?: number | undefined;
}

export interface ProposedTopologyLinkInput {
  targetProjectId: string;
  dependencyType: 'DEPENDS_ON' | 'REFERENCES';
  action: 'ADD' | 'REMOVE';
}

export interface SimulateSystemGateInput {
  rootProjectId: string;
  proposedBaselines?: ProposedBaselineInput[] | undefined;
  proposedAttestations?: ProposedAttestationInput[] | undefined;
  candidateWaivers?: CandidateWaiverInput[] | undefined;
  proposedTopologyLinks?: ProposedTopologyLinkInput[] | undefined;
}

export interface FulfillmentAssumptionDTO {
  packageId?: string | undefined;
  providerProjectId: string;
  assumedFulfillable: boolean;
  isHypothetical: true;
}

export interface AppliedCandidateWaiverDTO {
  targetProviderProjectId: string;
  blockerType: SystemBlockerType;
  reason: string;
  coverageImpact: string;
}

export interface SimulateSystemGateOutput {
  isSimulated: true;
  simulationId: string;
  evaluatedAt: Date;
  rootProjectId: string;
  baselineGateStatus: SystemReleaseStatus;
  simulatedGateStatus: SystemReleaseStatus;
  statusChanged: boolean;
  passed: boolean;
  simulationStatus: 'COMPLETE' | 'TRUNCATED_PARTIAL' | 'INDETERMINATE' | 'UNSUPPORTED';
  deltaSummary: {
    resolvedBlockersCount: number;
    remainingBlockersCount: number;
    newlyIntroducedBlockersCount: number;
    candidateWaiversAppliedCount: number;
  };
  resolvedBlockers: BlockingDependencyDTO[];
  remainingBlockers: BlockingDependencyDTO[];
  newlyIntroducedBlockers: BlockingDependencyDTO[];
  appliedCandidateWaivers: AppliedCandidateWaiverDTO[];
  fulfillmentAssumptions?: FulfillmentAssumptionDTO[] | undefined;
}
