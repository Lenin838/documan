/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { DocumentVersion } from '../documents/document-version.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { evaluateReleaseGateInternal } from './release-gate-evaluator.service.js';
import { calculateSystemBaselineAlignment } from './system-baseline-alignment.service.js';
import {
  evaluateSystemTopologyGovernanceGate,
  evaluateSystemGateFromState,
} from './system-topology-governance-gate.service.js';
import { simulateSystemTopologyGovernanceGate } from './system-topology-simulation.service.js';
import { SystemGovernanceWaiver } from './system-governance-waiver.model.js';

vi.mock('../projects/project.model.js');
vi.mock('../documents/document.model.js');
vi.mock('../documents/document-version.model.js');
vi.mock('../projects/project-topology.service.js');
vi.mock('./release-gate-evaluator.service.js');
vi.mock('./system-baseline-alignment.service.js');
vi.mock('./system-topology-governance-gate.service.js', async () => {
  const actual = await vi.importActual<any>('./system-topology-governance-gate.service.js');
  return {
    ...actual,
    evaluateSystemTopologyGovernanceGate: vi.fn(),
  };
});
vi.mock('./system-governance-waiver.model.js');
vi.mock('../projects/project-topology.model.js', () => ({
  ProjectTopologyLink: {
    find: vi.fn().mockReturnValue({
      populate: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    updateOne: vi.fn(),
  },
}));

describe('Phase 21: System Topology Simulation Service', () => {
  const userId = new Types.ObjectId().toString();
  const rootProjectId = new Types.ObjectId().toString();
  const providerProjectId = new Types.ObjectId().toString();
  const targetDocId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SystemGovernanceWaiver.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);
  });

  describe('Phase 19 Pure Evaluator Characterization Tests', () => {
    it('evaluates PASSED when root gate passes and zero dependencies exist', () => {
      const result = evaluateSystemGateFromState({
        isRootLocalGateBlocked: false,
        rootLocalGateResult: { status: 'PASSED', freshnessPercentage: 100, blockingDocuments: [] },
        rootProjectId,
        rootProjectName: 'Root Project',
        evaluationTimestamp: new Date(),
        isTruncated: false,
        alignmentResult: {
          aggregateState: 'ZERO_APPLICABLE_EVIDENCE',
          alignmentScore: null,
          evidenceCompleteness: null,
          summary: { totalUnits: 0, alignedUnits: 0, misalignedUnits: 0, indeterminateUnits: 0 },
        },
        blockedProvidersCount: 0,
        waivedBlockersCount: 0,
        unwaivedBlockersCount: 0,
        appliedWaiverIdsSet: new Set(),
        blockingDependencies: [],
      });

      expect(result.systemReleaseStatus).toBe('PASSED');
      expect(result.passed).toBe(true);
      expect(result.summary.totalDependencies).toBe(0);
    });

    it('evaluates GOVERNANCE_DISABLED when root project local gate is disabled', () => {
      const result = evaluateSystemGateFromState({
        isRootLocalGateBlocked: false,
        rootLocalGateResult: { status: 'GOVERNANCE_DISABLED', freshnessPercentage: 0, blockingDocuments: [] },
        rootProjectId,
        rootProjectName: 'Root Project',
        evaluationTimestamp: new Date(),
        isTruncated: false,
        alignmentResult: {
          aggregateState: 'ZERO_APPLICABLE_EVIDENCE',
          alignmentScore: null,
          evidenceCompleteness: null,
          summary: { totalUnits: 0, alignedUnits: 0, misalignedUnits: 0, indeterminateUnits: 0 },
        },
        blockedProvidersCount: 0,
        waivedBlockersCount: 0,
        unwaivedBlockersCount: 0,
        appliedWaiverIdsSet: new Set(),
        blockingDependencies: [],
      });

      expect(result.systemReleaseStatus).toBe('PASSED');
      expect(result.passed).toBe(true);
    });

    it('evaluates BLOCKED when an unwaived cross-project contract misalignment exists', () => {
      const result = evaluateSystemGateFromState({
        isRootLocalGateBlocked: false,
        rootLocalGateResult: { status: 'PASSED', freshnessPercentage: 100, blockingDocuments: [] },
        rootProjectId,
        rootProjectName: 'Root Project',
        evaluationTimestamp: new Date(),
        isTruncated: false,
        alignmentResult: {
          aggregateState: 'MISALIGNED',
          alignmentScore: 0,
          evidenceCompleteness: 100,
          summary: { totalUnits: 1, alignedUnits: 0, misalignedUnits: 1, indeterminateUnits: 0 },
        },
        blockedProvidersCount: 0,
        waivedBlockersCount: 0,
        unwaivedBlockersCount: 1,
        appliedWaiverIdsSet: new Set(),
        blockingDependencies: [
          {
            providerProjectId,
            providerProjectName: 'Provider Proj',
            consumerDocumentTitle: 'Consumer Doc',
            providerDocumentTitle: 'Provider Doc',
            targetDocumentId: targetDocId,
            contractVersionNumber: 1,
            blockerType: 'CONTRACT_MISALIGNED',
            reason: 'Misaligned contract',
            isWaived: false,
            appliedWaiverId: null,
            governanceEvidence: {
              providerBaselinePresent: true,
              consumerBaselinePresent: true,
              providerAttested: true,
              attestationStale: false,
              providerGovernanceEnabled: true,
              providerLocalGateStatus: 'PASSED',
            },
          },
        ],
      });

      expect(result.systemReleaseStatus).toBe('BLOCKED');
      expect(result.passed).toBe(false);
      expect(result.evidence.blockingDependencies.length).toBe(1);
    });
  });

  describe('simulateSystemTopologyGovernanceGate Integration', () => {
    it('throws error when user lacks read access to root project', async () => {
      vi.mocked(Project.findOne).mockResolvedValue({ _id: new Types.ObjectId(rootProjectId), isArchived: false } as any);
      vi.mocked(checkUserProjectReadAccess).mockResolvedValue(false);

      await expect(
        simulateSystemTopologyGovernanceGate(userId, 'user', rootProjectId, { rootProjectId }),
      ).rejects.toThrow('Access denied to project');
    });

    it('throws error when proposed topology link target is the root project (self-link)', async () => {
      vi.mocked(Project.findOne).mockResolvedValue({
        _id: new Types.ObjectId(rootProjectId),
        isArchived: false,
        governanceSettings: { isGovernanceEnabled: true },
      } as any);
      vi.mocked(checkUserProjectReadAccess).mockResolvedValue(true);

      await expect(
        simulateSystemTopologyGovernanceGate(userId, 'user', rootProjectId, {
          rootProjectId,
          proposedTopologyLinks: [
            { targetProjectId: rootProjectId, dependencyType: 'DEPENDS_ON', action: 'ADD' },
          ],
        }),
      ).rejects.toThrow('Self-referential topology links are not allowed');
    });

    it('throws error when proposed baseline references a non-existent document or version', async () => {
      vi.mocked(Project.findOne).mockResolvedValue({
        _id: new Types.ObjectId(rootProjectId),
        isArchived: false,
        governanceSettings: { isGovernanceEnabled: true },
      } as any);
      vi.mocked(checkUserProjectReadAccess).mockResolvedValue(true);
      vi.mocked(Document.findOne).mockResolvedValue({ _id: new Types.ObjectId(targetDocId), title: 'Doc' } as any);
      vi.mocked(DocumentVersion.findOne).mockResolvedValue(null);

      await expect(
        simulateSystemTopologyGovernanceGate(userId, 'user', rootProjectId, {
          rootProjectId,
          proposedBaselines: [
            { providerProjectId, targetDocumentId: targetDocId, versionNumber: 99 },
          ],
        }),
      ).rejects.toThrow('does not exist');
    });

    it('successfully computes simulation with candidate waiver overlay in-memory', async () => {
      vi.mocked(ProjectTopologyLink.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([
          {
            sourceProjectId: rootProjectId,
            targetProjectId: { _id: new Types.ObjectId(providerProjectId), isArchived: false, ownerId: new Types.ObjectId() },
          },
        ]),
      } as any);

      vi.mocked(Project.findOne).mockResolvedValue({
        _id: new Types.ObjectId(rootProjectId),
        name: 'Root Consumer Project',
        isArchived: false,
        governanceSettings: { isGovernanceEnabled: true },
      } as any);
      vi.mocked(checkUserProjectReadAccess).mockResolvedValue(true);
      vi.mocked(evaluateSystemTopologyGovernanceGate).mockResolvedValue({
        passed: false,
        systemReleaseStatus: 'BLOCKED',
        rootProjectId,
        evaluatedAt: new Date().toISOString(),
        summary: {
          totalDependencies: 1,
          alignedDependencies: 0,
          misalignedDependencies: 1,
          indeterminateDependencies: 0,
          blockedProviders: 0,
          waivedBlockers: 0,
          unwaivedBlockers: 1,
        },
        evidence: {
          rootLocalGate: { status: 'PASSED', freshnessPercentage: 100 },
          baselineAlignment: { aggregateState: 'MISALIGNED', alignmentScore: 0, evidenceCompleteness: 100 },
          blockingDependencies: [
            {
              providerProjectId,
              providerProjectName: 'Provider Proj',
              consumerDocumentTitle: 'Consumer Doc',
              providerDocumentTitle: 'Provider Doc',
              targetDocumentId: targetDocId,
              contractVersionNumber: 1,
              blockerType: 'CONTRACT_MISALIGNED',
              reason: 'Misaligned contract',
              isWaived: false,
              appliedWaiverId: null,
              governanceEvidence: {
                providerBaselinePresent: true,
                consumerBaselinePresent: true,
                providerAttested: true,
                attestationStale: false,
                providerGovernanceEnabled: true,
                providerLocalGateStatus: 'PASSED',
              },
            },
          ],
        },
      } as any);

      vi.mocked(evaluateReleaseGateInternal).mockResolvedValue({
        passed: true,
        status: 'PASSED',
        freshnessPercentage: 100,
        blockingDocuments: [],
      } as any);
      vi.mocked(calculateSystemBaselineAlignment).mockResolvedValue({
        aggregateState: 'MISALIGNED',
        alignmentScore: 0,
        evidenceCompleteness: 100,
        alignmentUnits: [
          {
            unitId: 'unit-1',
            consumerProject: { id: rootProjectId, name: 'Root Consumer' },
            consumerDocument: { id: 'doc-1', title: 'Consumer Doc' },
            providerProject: { id: providerProjectId, name: 'Provider Proj' },
            providerDocument: { id: targetDocId, title: 'Provider Doc' },
            alignmentState: 'MISALIGNED',
            consumerVersionRef: { versionNumber: 1 },
            providerActiveVersion: { versionNumber: 2 },
            governanceEvidence: {
              providerBaselinePresent: true,
              consumerBaselinePresent: true,
              providerAttested: true,
              attestationStale: false,
            },
          },
        ],
        summary: { totalUnits: 1, applicableUnits: 1, alignedUnits: 0, misalignedUnits: 1, indeterminateUnits: 0, evaluableUnits: 1 },
      } as any);

      const result = await simulateSystemTopologyGovernanceGate(userId, 'user', rootProjectId, {
        rootProjectId,
        candidateWaivers: [
          {
            targetProviderProjectId: providerProjectId,
            targetDocumentId: targetDocId,
            blockerType: 'CONTRACT_MISALIGNED',
            reason: 'Temporary simulation waiver',
          },
        ],
      });

      expect(result.isSimulated).toBe(true);
      expect(result.simulationStatus).toBe('COMPLETE');
      expect(result.baselineGateStatus).toBe('BLOCKED');
      expect(result.simulatedGateStatus).toBe('PASSED_WITH_WAIVER');
      expect(result.statusChanged).toBe(true);
      expect(result.appliedCandidateWaivers.length).toBe(1);
    });
  });
});
