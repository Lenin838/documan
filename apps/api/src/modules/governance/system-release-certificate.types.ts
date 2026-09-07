

export interface ILifecycleEvent {
  eventType: 'ISSUED' | 'REVOKED';
  performedByUserId: string;
  timestamp: string; // ISO-8601 string
  reason?: string;
}

export interface ITopologyNodeSnapshot {
  projectId: string;
  projectName: string;
  isGovernanceEnabled: boolean;
  localGatePassed: boolean;
}

export interface ITopologyEdgeSnapshot {
  sourceProjectId: string;
  targetProjectId: string;
  linkType: 'DEPENDS_ON' | 'PROVIDES_API_TO' | 'INTEGRATES_WITH' | 'SHARED_LIBRARY';
}

export interface IBaselineSnapshot {
  projectId: string;
  projectName: string;
  baselineId: string;
  versionTag: string;
  documentSnapshotsCount: number;
  createdTimestamp: string;
}

export interface IAttestationSnapshot {
  attestationId: string;
  packageId: string;
  packageName: string;
  attestedAt: string;
  attestorUserId: string;
  fulfillmentStatus: string;
}

export interface IWaiverSnapshot {
  waiverId: string;
  targetProviderProjectId: string;
  blockerType: string;
  targetDocumentId?: string;
  grantedByUserId: string;
  grantedAt: string;
  expiresAt: string; // Expiration timestamp frozen at T_cert
  waiverScope: string;
}

export interface ISystemReleaseSnapshot {
  rootProjectId: string;
  rootProjectName: string;
  releaseTag: string;
  certifiedAt: string; // ISO-8601 string
  systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
  topologyNodes: ITopologyNodeSnapshot[];
  topologyEdges: ITopologyEdgeSnapshot[];
  activeBaselines: IBaselineSnapshot[];
  activeAttestations: IAttestationSnapshot[];
  activeWaivers: IWaiverSnapshot[];
  evidenceSummary: {
    totalApplicableContracts: number;
    alignedContractsCount: number;
    waivedBlockersCount: number;
    systemAlignmentScore: number;
    evidenceCompletenessScore: number;
  };
}

export interface SystemReleasePreCheckResponseDTO {
  rootProjectId: string;
  rootProjectName: string;
  canCertify: boolean;
  systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';
  summary: {
    totalTopologyProjects: number;
    totalActiveBaselines: number;
    totalActiveAttestations: number;
    totalActiveWaivers: number;
    blockingDependenciesCount: number;
  };
  blockingReasons?: string[];
  snapshotPreview: ISystemReleaseSnapshot | null;
}

export interface IssueReleaseCertificateRequestDTO {
  releaseTag: string;
  notes?: string;
  supersedesCertificateId?: string;
}

export interface RevokeReleaseCertificateRequestDTO {
  revocationReason: string;
}

export interface SystemReleaseCertificateResponseDTO {
  id: string;
  rootProjectId: string;
  releaseTag: string;
  certificateVersion: number;
  certificateStatus: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
  systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
  certificateHash: string;
  certifiedByUserId: string;
  certifiedAt: string;
  notes?: string;
  supersedesCertificateId?: string;
  supersededByCertificateId?: string;
  lifecycleEvents: ILifecycleEvent[];
  snapshot: ISystemReleaseSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateVerificationResponseDTO {
  certificateId: string;
  releaseTag: string;
  integrity: {
    isHashValid: boolean;
    computedHash: string;
    storedHash: string;
    integrityStatus: 'INTEGRITY_VERIFIED' | 'TAMPER_DETECTED';
  };
  lifecycle: {
    status: 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';
    certifiedAt: string;
    certifiedByUserId: string;
    lifecycleEvents: ILifecycleEvent[];
    supersededBy?: {
      newerCertificateId: string;
      newerReleaseTag: string;
    };
  };
  currentLiveSystem: {
    currentSystemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER' | 'BLOCKED' | 'INDETERMINATE' | 'GOVERNANCE_DISABLED';
    matchesCertifiedState: boolean;
  };
}
