import { describe, it, expect } from 'vitest';
import {
  diffTopologySnapshots,
  diffBaselineSnapshots,
  diffWaiverSnapshots,
  diffAttestationSnapshots,
  calculateTrajectoryMetrics,
} from './system-release-lineage-helpers.js';
import type { ISystemReleaseSnapshot } from './system-release-certificate.types.js';

describe('system-release-lineage-helpers', () => {
  describe('diffTopologySnapshots', () => {
    it('detects added, removed, and unchanged nodes/edges correctly', () => {
      const sourceNodes = [
        { projectId: 'p1', projectName: 'P1', isGovernanceEnabled: true, localGatePassed: true },
        { projectId: 'p2', projectName: 'P2', isGovernanceEnabled: true, localGatePassed: true },
      ];
      const targetNodes = [
        { projectId: 'p2', projectName: 'P2', isGovernanceEnabled: true, localGatePassed: true },
        { projectId: 'p3', projectName: 'P3', isGovernanceEnabled: true, localGatePassed: true },
      ];

      const sourceEdges = [
        { sourceProjectId: 'p1', targetProjectId: 'p2', linkType: 'DEPENDS_ON' as const },
      ];
      const targetEdges = [
        { sourceProjectId: 'p2', targetProjectId: 'p3', linkType: 'DEPENDS_ON' as const },
      ];

      const result = diffTopologySnapshots(sourceNodes, sourceEdges, targetNodes, targetEdges);

      expect(result.addedNodes).toHaveLength(1);
      expect(result.addedNodes[0]?.projectId).toBe('p3');

      expect(result.removedNodes).toHaveLength(1);
      expect(result.removedNodes[0]?.projectId).toBe('p1');

      expect(result.unchangedNodes).toHaveLength(1);
      expect(result.unchangedNodes[0]?.projectId).toBe('p2');

      expect(result.addedEdges).toHaveLength(1);
      expect(result.removedEdges).toHaveLength(1);
    });
  });

  describe('diffBaselineSnapshots', () => {
    it('detects VERSION_ADVANCED and VERSION_REGRESSED baselines', () => {
      const source = [
        {
          projectId: 'p1',
          projectName: 'P1',
          baselineId: 'b1',
          versionTag: 'v1.0',
          documentSnapshotsCount: 1,
          createdTimestamp: '2026-01-01T00:00:00Z',
        },
      ];
      const target = [
        {
          projectId: 'p1',
          projectName: 'P1',
          baselineId: 'b2',
          versionTag: 'v2.0',
          documentSnapshotsCount: 2,
          createdTimestamp: '2026-06-01T00:00:00Z',
        },
      ];

      const result = diffBaselineSnapshots(source, target);

      expect(result).toHaveLength(1);
      expect(result[0]?.deltaType).toBe('VERSION_ADVANCED');
      expect(result[0]?.sourceVersionTag).toBe('v1.0');
      expect(result[0]?.targetVersionTag).toBe('v2.0');
    });
  });

  describe('diffWaiverSnapshots', () => {
    it('categorizes NEWLY_GRANTED, RESOLVED, and CARRIED_FORWARD waivers', () => {
      const source = [
        {
          waiverId: 'w1',
          targetProviderProjectId: 'p2',
          blockerType: 'CONTRACT_MISALIGNED',
          grantedByUserId: 'u1',
          grantedAt: '2026-01-01',
          expiresAt: '2026-12-31',
          waiverScope: 'ALL',
        },
      ];
      const target = [
        {
          waiverId: 'w2',
          targetProviderProjectId: 'p3',
          blockerType: 'PROVIDER_ATTESTATION_MISSING',
          grantedByUserId: 'u1',
          grantedAt: '2026-06-01',
          expiresAt: '2026-12-31',
          waiverScope: 'ALL',
        },
      ];

      const result = diffWaiverSnapshots(source, target, '2026-06-01T00:00:00Z');

      expect(result.find((w) => w.deltaType === 'NEWLY_GRANTED')).toBeDefined();
      expect(result.find((w) => w.deltaType === 'RESOLVED')).toBeDefined();
    });
  });

  describe('diffAttestationSnapshots', () => {
    it('categorizes EVIDENCE_ADDED and EVIDENCE_UNCHANGED attestations', () => {
      const source = [
        {
          attestationId: 'a1',
          packageId: 'pkg1',
          packageName: 'Package 1',
          attestedAt: '2026-01-01',
          attestorUserId: 'u1',
          fulfillmentStatus: 'FULFILLED',
        },
      ];
      const target = [
        {
          attestationId: 'a1',
          packageId: 'pkg1',
          packageName: 'Package 1',
          attestedAt: '2026-01-01',
          attestorUserId: 'u1',
          fulfillmentStatus: 'FULFILLED',
        },
        {
          attestationId: 'a2',
          packageId: 'pkg2',
          packageName: 'Package 2',
          attestedAt: '2026-06-01',
          attestorUserId: 'u1',
          fulfillmentStatus: 'FULFILLED',
        },
      ];

      const result = diffAttestationSnapshots(source, target);

      expect(result.find((a) => a.deltaType === 'EVIDENCE_UNCHANGED')).toBeDefined();
      expect(result.find((a) => a.deltaType === 'EVIDENCE_ADDED')).toBeDefined();
    });
  });

  describe('calculateTrajectoryMetrics', () => {
    const baseSnapshot: ISystemReleaseSnapshot = {
      rootProjectId: 'p1',
      rootProjectName: 'Root',
      releaseTag: 'REL-1',
      certifiedAt: '2026-01-01',
      systemReleaseStatus: 'PASSED',
      topologyNodes: [],
      topologyEdges: [],
      activeBaselines: [],
      activeAttestations: [],
      activeWaivers: [],
      evidenceSummary: {
        totalApplicableContracts: 10,
        alignedContractsCount: 8,
        waivedBlockersCount: 0,
        systemAlignmentScore: 80,
        evidenceCompletenessScore: 100,
      },
    };

    it('classifies IMPROVED when alignment increases and waivers decrease', () => {
      const targetSnapshot: ISystemReleaseSnapshot = {
        ...baseSnapshot,
        evidenceSummary: { ...baseSnapshot.evidenceSummary, systemAlignmentScore: 90 },
      };

      const result = calculateTrajectoryMetrics(baseSnapshot, targetSnapshot, []);

      expect(result.classification).toBe('IMPROVED');
      expect(result.deltaAlignmentScore).toBe(10);
    });

    it('classifies INDETERMINATE when totalApplicableContracts is 0 (Tier 1)', () => {
      const zeroSnapshot: ISystemReleaseSnapshot = {
        ...baseSnapshot,
        evidenceSummary: {
          totalApplicableContracts: 0,
          alignedContractsCount: 0,
          waivedBlockersCount: 0,
          systemAlignmentScore: 0,
          evidenceCompletenessScore: 0,
        },
      };

      const result = calculateTrajectoryMetrics(baseSnapshot, zeroSnapshot, []);

      expect(result.classification).toBe('INDETERMINATE');
      expect(result.deltaAlignmentScore).toBeNull();
      expect(result.statusReason).toBe('ZERO_APPLICABLE_EVIDENCE');
    });

    it('classifies DEGRADED when breaking contract deltas exist (Tier 2)', () => {
      const targetSnapshot: ISystemReleaseSnapshot = {
        ...baseSnapshot,
        evidenceSummary: { ...baseSnapshot.evidenceSummary, systemAlignmentScore: 90 },
      };

      const breakingDeltas = [
        {
          deltaCode: 'ENDPOINT_REMOVED' as const,
          method: 'GET',
          path: '/api/v1/users',
          description: 'Removed endpoint',
          riskTier: 'BREAKING' as const,
        },
      ];

      const result = calculateTrajectoryMetrics(baseSnapshot, targetSnapshot, breakingDeltas);

      expect(result.classification).toBe('DEGRADED');
      expect(result.hasBreakingContractDeltas).toBe(true);
    });
  });
});
