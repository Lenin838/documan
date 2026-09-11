import { describe, it, expect } from 'vitest';
import {
  diffTopologyWithLive,
  diffBaselinesWithLive,
  diffWaiversWithLive,
  diffAttestationsWithLive,
  evaluateLiveComplianceStatus,
  synthesizeVarianceExplanations,
  synthesizeNextReviewConsiderations,
} from './system-release-drift-helpers.js';
import type {
  ITopologyNodeSnapshot,
  ITopologyEdgeSnapshot,
  IBaselineSnapshot,
  IWaiverSnapshot,
  IAttestationSnapshot,
} from './system-release-certificate.types.js';

describe('system-release-drift-helpers', () => {
  describe('diffTopologyWithLive', () => {
    it('detects added and removed topology nodes and edges', () => {
      const certNodes: ITopologyNodeSnapshot[] = [
        { projectId: 'p1', projectName: 'P1', isGovernanceEnabled: true, localGatePassed: true },
        { projectId: 'p2', projectName: 'P2', isGovernanceEnabled: true, localGatePassed: true },
      ];
      const certEdges: ITopologyEdgeSnapshot[] = [
        { sourceProjectId: 'p1', targetProjectId: 'p2', linkType: 'PROVIDES_API_TO' },
      ];

      const liveNodes: ITopologyNodeSnapshot[] = [
        { projectId: 'p1', projectName: 'P1', isGovernanceEnabled: true, localGatePassed: true },
        { projectId: 'p3', projectName: 'P3', isGovernanceEnabled: true, localGatePassed: true },
      ];
      const liveEdges: ITopologyEdgeSnapshot[] = [
        { sourceProjectId: 'p1', targetProjectId: 'p3', linkType: 'PROVIDES_API_TO' },
      ];

      const res = diffTopologyWithLive(certNodes, certEdges, liveNodes, liveEdges);

      expect(res.addedNodes).toHaveLength(1);
      expect(res.addedNodes[0]?.projectId).toBe('p3');
      expect(res.removedNodes).toHaveLength(1);
      expect(res.removedNodes[0]?.projectId).toBe('p2');
      expect(res.addedEdges).toHaveLength(1);
      expect(res.removedEdges).toHaveLength(1);
      expect(res.varianceCount).toBe(4);
    });
  });

  describe('diffBaselinesWithLive', () => {
    it('detects UNCHANGED, VERSION_ADVANCED, and BASELINE_DEACTIVATED', () => {
      const certBaselines: IBaselineSnapshot[] = [
        {
          projectId: 'p1',
          projectName: 'P1',
          baselineId: 'b1',
          versionTag: 'v1.0.0',
          documentSnapshotsCount: 1,
          createdTimestamp: '2026-01-01T00:00:00Z',
        },
        {
          projectId: 'p2',
          projectName: 'P2',
          baselineId: 'b2',
          versionTag: 'v1.0.0',
          documentSnapshotsCount: 1,
          createdTimestamp: '2026-01-01T00:00:00Z',
        },
      ];

      const liveBaselines = [
        { projectId: 'p1', projectName: 'P1', baselineId: 'b1', versionTag: 'v1.0.0' },
        { projectId: 'p2', projectName: 'P2', baselineId: 'b2', versionTag: 'v2.0.0' },
      ];

      const res = diffBaselinesWithLive(certBaselines, liveBaselines);

      expect(res).toHaveLength(2);
      expect(res[0]?.deltaType).toBe('UNCHANGED');
      expect(res[1]?.deltaType).toBe('VERSION_ADVANCED');
    });
  });

  describe('diffWaiversWithLive', () => {
    it('detects EXPIRED_POST_CERTIFICATION and CARRIED_FORWARD waivers', () => {
      const nowIso = '2026-09-11T12:00:00Z';
      const certWaivers: IWaiverSnapshot[] = [
        {
          waiverId: 'w1',
          targetProviderProjectId: 'p2',
          blockerType: 'CONTRACT_BREAK',
          grantedByUserId: 'u1',
          grantedAt: '2026-01-01T00:00:00Z',
          expiresAt: '2026-05-01T00:00:00Z', // Expired relative to nowIso
          waiverScope: 'ALL',
        },
        {
          waiverId: 'w2',
          targetProviderProjectId: 'p3',
          blockerType: 'TOPOLOGY',
          grantedByUserId: 'u1',
          grantedAt: '2026-01-01T00:00:00Z',
          expiresAt: '2026-12-31T00:00:00Z', // Valid relative to nowIso
          waiverScope: 'ALL',
        },
      ];

      const liveWaivers = [
        {
          waiverId: 'w1',
          targetProviderProjectId: 'p2',
          blockerType: 'CONTRACT_BREAK',
          expiresAt: '2026-05-01T00:00:00Z',
          waiverScope: 'ALL',
        },
        {
          waiverId: 'w2',
          targetProviderProjectId: 'p3',
          blockerType: 'TOPOLOGY',
          expiresAt: '2026-12-31T00:00:00Z',
          waiverScope: 'ALL',
        },
      ];

      const res = diffWaiversWithLive(certWaivers, liveWaivers, nowIso);

      expect(res).toHaveLength(2);
      expect(res[0]?.deltaType).toBe('EXPIRED_POST_CERTIFICATION');
      expect(res[1]?.deltaType).toBe('CARRIED_FORWARD');
    });
  });

  describe('evaluateLiveComplianceStatus', () => {
    it('enforces precedence INDETERMINATE > NON_COMPLIANT > EXCEPTIONS > FULLY_COMPLIANT', () => {
      // 1. Indeterminate check
      const indRes = evaluateLiveComplianceStatus({
        liveSystemReleaseStatus: 'INDETERMINATE',
        totalApplicableContracts: 0,
        topologyVarianceCount: 0,
        baselineDeltas: [],
        contractDeltas: [],
        waiverDeltas: [],
        attestationDeltas: [],
      });
      expect(indRes.status).toBe('INDETERMINATE_EVIDENCE');

      // 2. Non-compliant check with expired waiver
      const ncRes = evaluateLiveComplianceStatus({
        liveSystemReleaseStatus: 'PASSED',
        totalApplicableContracts: 2,
        topologyVarianceCount: 0,
        baselineDeltas: [],
        contractDeltas: [],
        waiverDeltas: [
          {
            waiverId: 'w1',
            targetProviderProjectId: 'p2',
            blockerType: 'CONTRACT',
            certifiedExpiresAt: '2026-01-01',
            certifiedWaiverScope: 'ALL',
            deltaType: 'EXPIRED_POST_CERTIFICATION',
            explanation: 'Expired',
          },
        ],
        attestationDeltas: [],
      });
      expect(ncRes.status).toBe('NON_COMPLIANT_DRIFT');

      // 3. Compliant with exceptions check (VERSION_ADVANCED)
      const excRes = evaluateLiveComplianceStatus({
        liveSystemReleaseStatus: 'PASSED',
        totalApplicableContracts: 2,
        topologyVarianceCount: 0,
        baselineDeltas: [
          {
            projectId: 'p1',
            projectName: 'P1',
            certifiedBaselineId: 'b1',
            certifiedVersionTag: 'v1.0.0',
            liveBaselineId: 'b1',
            liveVersionTag: 'v2.0.0',
            deltaType: 'VERSION_ADVANCED',
            explanation: 'Advanced',
          },
        ],
        contractDeltas: [],
        waiverDeltas: [],
        attestationDeltas: [],
      });
      expect(excRes.status).toBe('COMPLIANT_WITH_EXCEPTIONS');

      // 4. Fully compliant check
      const fcRes = evaluateLiveComplianceStatus({
        liveSystemReleaseStatus: 'PASSED',
        totalApplicableContracts: 2,
        topologyVarianceCount: 0,
        baselineDeltas: [],
        contractDeltas: [],
        waiverDeltas: [],
        attestationDeltas: [],
      });
      expect(fcRes.status).toBe('FULLY_COMPLIANT');
    });
  });

  describe('diffAttestationsWithLive', () => {
    it('detects EVIDENCE_UNCHANGED and EVIDENCE_ADDED', () => {
      const certAttestations: IAttestationSnapshot[] = [
        {
          attestationId: 'a1',
          packageId: 'pkg1',
          packageName: 'Pkg1',
          attestedAt: '2026-01-01',
          attestorUserId: 'u1',
          fulfillmentStatus: 'FULFILLED',
        },
      ];

      const liveAttestations = [
        { attestationId: 'a1', packageId: 'pkg1', packageName: 'Pkg1', fulfillmentStatus: 'FULFILLED' },
        { attestationId: 'a2', packageId: 'pkg2', packageName: 'Pkg2', fulfillmentStatus: 'FULFILLED' },
      ];

      const res = diffAttestationsWithLive(certAttestations, liveAttestations);
      expect(res).toHaveLength(2);
      expect(res[0]?.deltaType).toBe('EVIDENCE_UNCHANGED');
      expect(res[1]?.deltaType).toBe('EVIDENCE_ADDED');
    });
  });

  describe('synthesis helpers', () => {
    it('synthesizes variance explanations and considerations correctly', () => {
      const explanations = synthesizeVarianceExplanations({
        topologyDiff: { addedNodes: [], removedNodes: [], addedEdges: [], removedEdges: [], varianceCount: 0 },
        baselineDeltas: [],
        contractDeltas: [],
        waiverDeltas: [],
        attestationDeltas: [],
      });

      const considerations = synthesizeNextReviewConsiderations({
        complianceStatus: 'FULLY_COMPLIANT',
        waiverDeltas: [],
        contractDeltas: [],
        baselineDeltas: [],
      });

      expect(explanations).toHaveLength(1);
      expect(explanations[0]).toContain('No material variance detected');
      expect(considerations).toHaveLength(1);
      expect(considerations[0]).toContain('fully aligned');
    });
  });
});
