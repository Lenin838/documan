import { SystemReleaseStatus } from './system-topology-governance-gate.types.js';

export type HistoricalReconstructionCompleteness = 'COMPLETE' | 'INDETERMINATE_HISTORICAL_EVIDENCE';

export type CausalityClassification =
  | 'OBSERVED_EVENT'
  | 'DERIVED_TRANSITION'
  | 'ASSOCIATED_EVENT'
  | 'PROVEN_CAUSALITY';

export type TimelineEventType =
  | 'BASELINE_CREATED'
  | 'ATTESTATION_FULFILLED'
  | 'WAIVER_GRANTED'
  | 'WAIVER_REVOKED'
  | 'WAIVER_EXPIRED'
  | 'TOPOLOGY_LINK_CREATED';

export interface TimelineDerivedTransition {
  previousStatus: SystemReleaseStatus;
  newStatus: SystemReleaseStatus;
  gateStateChanged: boolean;
}

export interface TimelineEntry {
  entryId: string;
  timestamp: string;
  eventType: TimelineEventType;
  sourceEntityId: string;
  sourceEntityType: 'DocumentationBaseline' | 'PackageFulfillmentAttestation' | 'SystemGovernanceWaiver' | 'ProjectTopologyLink';
  projectId: string;
  projectName: string;
  summary: string;
  causalityClassification: CausalityClassification;
  derivedTransition?: TimelineDerivedTransition | undefined;
}

export interface HistoricalSystemGateResult {
  rootProjectId: string;
  evaluatedAtTimestamp: string;
  reconstructionCompleteness: HistoricalReconstructionCompleteness;
  completenessReason?: string | null;
  systemReleaseStatus: SystemReleaseStatus;
  passed: boolean;
  subsystems: {
    rootLocalGate: {
      passed: boolean;
      status: string;
    };
    baselineAlignment: {
      alignmentScore: number | null;
      evidenceCompleteness: number | null;
      alignmentState: string;
    };
    providerAttestationSummary: {
      totalAttestations: number;
      staleAttestations: number;
      missingAttestations: number;
    };
    blockingDependencies: Array<{
      providerProjectId: string;
      providerProjectName: string;
      blockerType: string;
      reason: string;
      isWaived: boolean;
      waiverId: string | null;
    }>;
  };
}

export interface SystemGovernanceStateDiff {
  rootProjectId: string;
  t1: string;
  t2: string;
  reconstructionCompleteness: HistoricalReconstructionCompleteness;
  completenessReason?: string | null;
  gateStateChanged: boolean;
  previousSystemReleaseStatus: SystemReleaseStatus;
  newSystemReleaseStatus: SystemReleaseStatus;
  newlyBlockedDependencies: Array<{
    providerProjectId: string;
    providerProjectName: string;
    blockerType: string;
    reason: string;
  }>;
  newlyResolvedDependencies: Array<{
    providerProjectId: string;
    providerProjectName: string;
    blockerType: string;
    reason: string;
  }>;
  unaffectedDependencies: Array<{
    providerProjectId: string;
    providerProjectName: string;
    blockerType: string;
    reason: string;
  }>;
}

export interface SystemGovernanceTimelineResult {
  rootProjectId: string;
  windowStart: string;
  windowEnd: string;
  reconstructionCompleteness: HistoricalReconstructionCompleteness;
  totalEntries: number;
  entries: TimelineEntry[];
  hasMore: boolean;
}
