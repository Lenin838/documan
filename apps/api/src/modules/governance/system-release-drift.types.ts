import type {
  ITopologyNodeSnapshot,
  ITopologyEdgeSnapshot,
} from './system-release-certificate.types.js';
import type { ContractDeltaItemDTO } from './system-contract-evolution.types.js';

export type LiveComplianceStatus =
  | 'FULLY_COMPLIANT'
  | 'COMPLIANT_WITH_EXCEPTIONS'
  | 'NON_COMPLIANT_DRIFT'
  | 'INDETERMINATE_EVIDENCE';

export type BaselineDeltaType =
  | 'UNCHANGED'
  | 'VERSION_ADVANCED'
  | 'VERSION_REGRESSED'
  | 'BASELINE_DEACTIVATED'
  | 'BASELINE_REPLACED'
  | 'MISSING_LIVE_EVIDENCE';

export type WaiverDeltaType =
  | 'CARRIED_FORWARD'
  | 'EXPIRED_POST_CERTIFICATION'
  | 'REVOKED_POST_CERTIFICATION'
  | 'SCOPE_CHANGED'
  | 'NEWLY_GRANTED_POST_CERTIFICATION';

export type AttestationDeltaType =
  | 'EVIDENCE_UNCHANGED'
  | 'EVIDENCE_ADDED'
  | 'EVIDENCE_REMOVED'
  | 'EVIDENCE_STALE'
  | 'MISSING_LIVE_EVIDENCE';

export interface BaselineDeltaItemDTO {
  projectId: string;
  projectName: string;
  certifiedBaselineId: string;
  certifiedVersionTag: string;
  liveBaselineId?: string;
  liveVersionTag?: string;
  deltaType: BaselineDeltaType;
  explanation: string;
}

export interface WaiverDeltaItemDTO {
  waiverId: string;
  targetProviderProjectId: string;
  blockerType: string;
  certifiedExpiresAt: string;
  liveExpiresAt?: string;
  certifiedWaiverScope: string;
  liveWaiverScope?: string;
  deltaType: WaiverDeltaType;
  explanation: string;
}

export interface AttestationDeltaItemDTO {
  attestationId: string;
  packageId: string;
  packageName: string;
  certifiedStatus: string;
  liveStatus?: string;
  deltaType: AttestationDeltaType;
  explanation: string;
}

export interface ComplianceAuditRequestDTO {
  certificateId: string;
}

export interface ReleaseCertificateComplianceAuditDTO {
  auditMetadata: {
    certificateId: string;
    releaseTag: string;
    certifiedAt: string;
    auditTimestamp: string; // T_now ISO string
    rootProjectId: string;
    certificateStatus: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
    certifiedSystemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
    liveSystemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';
    matchesCertifiedState: boolean;
    isIntegrityVerified: boolean;
  };
  complianceStatus: LiveComplianceStatus;
  complianceReason?: string;
  varianceExplanations: string[];
  nextReviewConsiderations: string[];
  varianceSummary: {
    topologyVarianceCount: number;
    baselineVarianceCount: number;
    contractVarianceCount: number;
    waiverVarianceCount: number;
    attestationVarianceCount: number;
  };
  topologyDeltas: {
    addedNodes: ITopologyNodeSnapshot[];
    removedNodes: ITopologyNodeSnapshot[];
    addedEdges: ITopologyEdgeSnapshot[];
    removedEdges: ITopologyEdgeSnapshot[];
  };
  baselineDeltas: BaselineDeltaItemDTO[];
  contractDeltas: ContractDeltaItemDTO[];
  waiverDeltas: WaiverDeltaItemDTO[];
  attestationDeltas: AttestationDeltaItemDTO[];
}
