/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import {
  evaluateSystemGateAt,
  generateSystemGovernanceTimeline,
  calculateGovernanceStateDiff,
} from './system-governance-lineage.service.js';
import { Project } from '../projects/project.model.js';
import { ProjectTopologyLink } from '../projects/project-topology.model.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { DocumentationBaseline } from './documentation-baseline.model.js';
import { PackageFulfillmentAttestation } from '../change-packages/change-package-attestation.model.js';
import { SystemGovernanceWaiver } from './system-governance-waiver.model.js';

vi.mock('../projects/project.model.js');
vi.mock('../projects/project-topology.model.js');
vi.mock('../projects/project-topology.service.js');
vi.mock('./documentation-baseline.model.js');
vi.mock('../change-packages/change-package-attestation.model.js');
vi.mock('./system-governance-waiver.model.js');

describe('system-governance-lineage.service', () => {
  const userId = new Types.ObjectId().toString();
  const rootProjectId = new Types.ObjectId().toString();
  const providerProjectId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluateSystemGateAt', () => {
    it('should throw 400 for invalid timestamp format', async () => {
      await expect(
        evaluateSystemGateAt(userId, 'user', rootProjectId, 'invalid-date'),
      ).rejects.toThrow('Invalid timestamp format');
    });

    it('should return INDETERMINATE_HISTORICAL_EVIDENCE if project did not exist at T', async () => {
      const now = new Date();
      const pastT = new Date(now.getTime() - 100000);

      vi.mocked(Project.findOne).mockResolvedValueOnce({
        _id: new Types.ObjectId(rootProjectId),
        name: 'Root Project',
        createdAt: now,
      } as any);

      const result = await evaluateSystemGateAt(userId, 'user', rootProjectId, pastT);

      expect(result.reconstructionCompleteness).toBe('INDETERMINATE_HISTORICAL_EVIDENCE');
      expect(result.systemReleaseStatus).toBe('INDETERMINATE');
    });

    it('should throw 403 if user lacks ACL read access to project', async () => {
      const targetT = new Date();

      vi.mocked(Project.findOne).mockResolvedValueOnce({
        _id: new Types.ObjectId(rootProjectId),
        name: 'Root Project',
        createdAt: new Date(targetT.getTime() - 50000),
      } as any);

      vi.mocked(checkUserProjectReadAccess).mockResolvedValueOnce(false);

      await expect(
        evaluateSystemGateAt(userId, 'user', rootProjectId, targetT),
      ).rejects.toThrow('Access denied to project');
    });

    it('should evaluate historical gate status at T when baseline and attestations exist', async () => {
      const targetT = new Date();

      vi.mocked(Project.findOne).mockResolvedValueOnce({
        _id: new Types.ObjectId(rootProjectId),
        name: 'Root Project',
        createdAt: new Date(targetT.getTime() - 50000),
      } as any);

      vi.mocked(checkUserProjectReadAccess).mockResolvedValue(true);

      vi.mocked(ProjectTopologyLink.find).mockReturnValueOnce({
        populate: vi.fn().mockResolvedValueOnce([
          {
            targetProjectId: {
              _id: new Types.ObjectId(providerProjectId),
              name: 'Provider Project',
              createdAt: new Date(targetT.getTime() - 40000),
            },
          },
        ]),
      } as any);

      vi.mocked(SystemGovernanceWaiver.find).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce([]),
      } as any);

      vi.mocked(DocumentationBaseline.findOne)
        .mockReturnValueOnce({
          sort: vi.fn().mockResolvedValueOnce({
            _id: new Types.ObjectId(),
            projectId: new Types.ObjectId(rootProjectId),
            versionTag: '1.0',
            createdAt: new Date(targetT.getTime() - 30000),
          }),
        } as any)
        .mockReturnValueOnce({
          sort: vi.fn().mockResolvedValueOnce({
            _id: new Types.ObjectId(),
            projectId: new Types.ObjectId(providerProjectId),
            versionTag: '1.0',
            createdAt: new Date(targetT.getTime() - 25000),
          }),
        } as any);

      vi.mocked(PackageFulfillmentAttestation.findOne)
        .mockReturnValueOnce({
          sort: vi.fn().mockResolvedValueOnce({
            _id: new Types.ObjectId(),
            projectId: new Types.ObjectId(rootProjectId),
            createdAt: new Date(targetT.getTime() - 29000),
          }),
        } as any)
        .mockReturnValueOnce({
          sort: vi.fn().mockResolvedValueOnce({
            _id: new Types.ObjectId(),
            projectId: new Types.ObjectId(providerProjectId),
            createdAt: new Date(targetT.getTime() - 20000),
          }),
        } as any);

      const result = await evaluateSystemGateAt(userId, 'user', rootProjectId, targetT);

      expect(result.reconstructionCompleteness).toBe('COMPLETE');
      expect(result.passed).toBe(true);
      expect(result.systemReleaseStatus).toBe('PASSED');
    });
  });

  describe('generateSystemGovernanceTimeline', () => {
    it('should throw 400 if window range exceeds 90 days', async () => {
      const now = new Date();
      const wayPast = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);

      await expect(
        generateSystemGovernanceTimeline(userId, 'user', rootProjectId, wayPast, now),
      ).rejects.toThrow('Timeline window cannot exceed 90 days');
    });
  });

  describe('calculateGovernanceStateDiff', () => {
    it('should throw 400 if T1 is after T2', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 10000);

      await expect(
        calculateGovernanceStateDiff(userId, 'user', rootProjectId, now, past),
      ).rejects.toThrow('Timestamp T1 cannot be after timestamp T2');
    });
  });
});
