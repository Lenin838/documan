import { describe, it, expect } from 'vitest';
import { canonicalizeSnapshot, computeCertificateHash } from './system-release-certificate.service.js';
import { ISystemReleaseSnapshot } from './system-release-certificate.types.js';

describe('SystemReleaseCertificate Service Unit Tests', () => {
  const dummySnapshot: ISystemReleaseSnapshot = {
    rootProjectId: '650000000000000000000001',
    rootProjectName: 'Root Test Project',
    releaseTag: 'v1.0.0',
    certifiedAt: '2026-09-07T20:00:00.000Z',
    systemReleaseStatus: 'PASSED',
    topologyNodes: [
      { projectId: '650000000000000000000002', projectName: 'Provider B', isGovernanceEnabled: true, localGatePassed: true },
      { projectId: '650000000000000000000001', projectName: 'Root A', isGovernanceEnabled: true, localGatePassed: true },
    ],
    topologyEdges: [
      { sourceProjectId: '650000000000000000000001', targetProjectId: '650000000000000000000002', linkType: 'DEPENDS_ON' },
    ],
    activeBaselines: [
      { projectId: '650000000000000000000001', projectName: 'Root A', baselineId: 'base1', versionTag: 'v1', documentSnapshotsCount: 2, createdTimestamp: '2026-09-01T00:00:00.000Z' },
    ],
    activeAttestations: [],
    activeWaivers: [],
    evidenceSummary: {
      totalApplicableContracts: 1,
      alignedContractsCount: 1,
      waivedBlockersCount: 0,
      systemAlignmentScore: 100,
      evidenceCompletenessScore: 100,
    },
  };

  it('should canonicalize snapshot object deterministically', () => {
    const json1 = canonicalizeSnapshot(dummySnapshot);
    
    // Create copy with inverted key insertion order
    const dummySnapshotInverted: ISystemReleaseSnapshot = {
      evidenceSummary: { ...dummySnapshot.evidenceSummary },
      activeWaivers: [],
      activeAttestations: [],
      activeBaselines: [...dummySnapshot.activeBaselines],
      topologyEdges: [...dummySnapshot.topologyEdges],
      topologyNodes: [...dummySnapshot.topologyNodes],
      systemReleaseStatus: 'PASSED',
      certifiedAt: '2026-09-07T20:00:00.000Z',
      releaseTag: 'v1.0.0',
      rootProjectName: 'Root Test Project',
      rootProjectId: '650000000000000000000001',
    };

    const json2 = canonicalizeSnapshot(dummySnapshotInverted);
    expect(json1).toEqual(json2);
  });

  it('should compute consistent SHA-256 hash across multiple calls', () => {
    const hash1 = computeCertificateHash(dummySnapshot);
    const hash2 = computeCertificateHash(dummySnapshot);
    expect(hash1).toEqual(hash2);
    expect(hash1.length).toBe(64); // 64 hex characters
  });

  it('should produce different SHA-256 hash when snapshot content is altered', () => {
    const hashOriginal = computeCertificateHash(dummySnapshot);

    const alteredSnapshot: ISystemReleaseSnapshot = {
      ...dummySnapshot,
      releaseTag: 'v1.0.1-modified',
    };

    const hashAltered = computeCertificateHash(alteredSnapshot);
    expect(hashOriginal).not.toEqual(hashAltered);
  });
});
