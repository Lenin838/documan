/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import { Project } from '../projects/project.model.js';
import { evaluateSystemTopologyGovernanceGate } from './system-topology-governance-gate.service.js';
import { evaluateReleaseGateInternal } from './release-gate-evaluator.service.js';
import { calculateSystemBaselineAlignment } from './system-baseline-alignment.service.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';

vi.mock('../projects/project.model.js');
vi.mock('./release-gate-evaluator.service.js');
vi.mock('./system-baseline-alignment.service.js');
vi.mock('../projects/project-topology.service.js');
vi.mock('../projects/project-topology.model.js', () => ({
  ProjectTopologyLink: {
    find: vi.fn().mockReturnValue({
      populate: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

describe('evaluateSystemTopologyGovernanceGate', () => {
  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 404 for invalid project ID', async () => {
    await expect(
      evaluateSystemTopologyGovernanceGate(userId, 'user', 'invalid-id'),
    ).rejects.toThrow('Invalid project ID');
  });

  it('throws 404 if project is not found', async () => {
    vi.mocked(Project.findOne).mockResolvedValue(null);
    await expect(
      evaluateSystemTopologyGovernanceGate(userId, 'user', projectId),
    ).rejects.toThrow('Project not found');
  });

  it('throws 403 if user lacks read access', async () => {
    vi.mocked(Project.findOne).mockResolvedValue({ _id: new Types.ObjectId(projectId) } as any);
    vi.mocked(checkUserProjectReadAccess).mockResolvedValue(false);

    await expect(
      evaluateSystemTopologyGovernanceGate(userId, 'user', projectId),
    ).rejects.toThrow('Access denied to project');
  });

  it('returns GOVERNANCE_DISABLED with passed: false when root project governance is disabled', async () => {
    vi.mocked(Project.findOne).mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      governanceSettings: { isGovernanceEnabled: false },
    } as any);
    vi.mocked(checkUserProjectReadAccess).mockResolvedValue(true);
    vi.mocked(evaluateReleaseGateInternal).mockResolvedValue({
      passed: true,
      status: 'GOVERNANCE_DISABLED',
      freshnessPercentage: 100,
    } as any);

    const result = await evaluateSystemTopologyGovernanceGate(userId, 'user', projectId);

    expect(result.systemReleaseStatus).toBe('GOVERNANCE_DISABLED');
    expect(result.passed).toBe(false);
    expect(result.evidence.rootLocalGate.status).toBe('GOVERNANCE_DISABLED');
  });

  it('returns PASSED with passed: true when root gate passes and zero dependencies exist', async () => {
    vi.mocked(Project.findOne).mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      name: 'Root Project',
      governanceSettings: { isGovernanceEnabled: true },
    } as any);
    vi.mocked(checkUserProjectReadAccess).mockResolvedValue(true);
    vi.mocked(evaluateReleaseGateInternal).mockResolvedValue({
      passed: true,
      status: 'PASSED',
      freshnessPercentage: 100,
      blockingDocuments: [],
    } as any);
    vi.mocked(calculateSystemBaselineAlignment).mockResolvedValue({
      aggregateState: 'ZERO_APPLICABLE_EVIDENCE',
      alignmentScore: null,
      evidenceCompleteness: null,
      alignmentUnits: [],
      summary: {
        totalUnits: 0,
        applicableUnits: 0,
        alignedUnits: 0,
        misalignedUnits: 0,
        indeterminateUnits: 0,
        evaluableUnits: 0,
      },
    } as any);

    const result = await evaluateSystemTopologyGovernanceGate(userId, 'user', projectId);

    expect(result.systemReleaseStatus).toBe('PASSED');
    expect(result.passed).toBe(true);
    expect(result.summary.totalDependencies).toBe(0);
  });

  it('returns BLOCKED with passed: false when cross-project contract is misaligned', async () => {
    vi.mocked(Project.findOne).mockResolvedValue({
      _id: new Types.ObjectId(projectId),
      name: 'Consumer Project',
      governanceSettings: { isGovernanceEnabled: true },
    } as any);
    vi.mocked(checkUserProjectReadAccess).mockResolvedValue(true);
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
          consumerProject: { id: projectId, name: 'Consumer Project' },
          consumerDocument: { id: 'doc-1', title: 'API Client' },
          providerProject: { id: 'provider-1', name: 'Provider Service' },
          providerDocument: { id: 'doc-2', title: 'API Spec' },
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
      summary: {
        totalUnits: 1,
        applicableUnits: 1,
        alignedUnits: 0,
        misalignedUnits: 1,
        indeterminateUnits: 0,
        evaluableUnits: 1,
      },
    } as any);

    const result = await evaluateSystemTopologyGovernanceGate(userId, 'user', projectId);

    expect(result.systemReleaseStatus).toBe('BLOCKED');
    expect(result.passed).toBe(false);
    expect(result.evidence.blockingDependencies.length).toBeGreaterThan(0);
  });
});
