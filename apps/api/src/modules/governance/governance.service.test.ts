/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import {
  updateProjectGovernance,
} from './governance.service.js';

describe('Governance Service & Authorization', () => {
  const ownerId = new Types.ObjectId().toString();
  const nonOwnerId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProjectGovernance Authorization', () => {
    it('should throw 403 Forbidden for non-owner and non-admin users', async () => {
      vi.spyOn(Project, 'findOne').mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(ownerId),
        isArchived: false,
      } as any);

      await expect(
        updateProjectGovernance(nonOwnerId, 'user', projectId, {
          maxUnreviewedDays: 60,
        }),
      ).rejects.toThrow('Forbidden');
    });

    it('should allow Project Owner to update governance settings', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockProject = {
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(ownerId),
        isArchived: false,
        governanceSettings: {
          isGovernanceEnabled: true,
          maxUnreviewedDays: 90,
          autoMarkStaleOnUpstreamChange: true,
        },
        save: mockSave,
      };

      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);
      vi.spyOn(Document, 'countDocuments').mockResolvedValue(0 as any);
      vi.spyOn(Document, 'find').mockResolvedValue([] as any);

      const res = await updateProjectGovernance(ownerId, 'user', projectId, {
        maxUnreviewedDays: 30,
      });

      expect(mockProject.governanceSettings.maxUnreviewedDays).toBe(30);
      expect(mockSave).toHaveBeenCalled();
      expect(res.governanceSettings.maxUnreviewedDays).toBe(30);
    });
  });
});
