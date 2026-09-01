/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import { Project } from '../projects/project.model.js';
import {
  createProjectGateToken,
  getProjectGateTokens,
  revokeProjectGateToken,
} from './governance.service.js';

describe('CI Gate Token Service', () => {
  const ownerId = new Types.ObjectId().toString();
  const nonOwnerId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Generation & Hashing', () => {
    it('should generate plaintext documan_gate_ token and store SHA-256 hash', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockProject = {
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(ownerId),
        isArchived: false,
        gateTokens: [],
        save: mockSave,
      };

      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);

      const res = await createProjectGateToken(ownerId, 'user', projectId, {
        name: 'GitHub CI Token',
        expiresInDays: 90,
      });

      expect(res.token).toContain('documan_gate_');
      expect(mockProject.gateTokens.length).toBe(1);
      expect((mockProject.gateTokens[0] as any).tokenHash).not.toEqual(res.token); // Store hash, not plaintext
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw 403 Forbidden for non-owner and non-admin users', async () => {
      vi.spyOn(Project, 'findOne').mockResolvedValue({
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(ownerId),
        isArchived: false,
      } as any);

      await expect(
        createProjectGateToken(nonOwnerId, 'user', projectId, {
          name: 'Unauthorized Token',
        }),
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('Token Listing & Revocation', () => {
    it('should list token metadata without tokenHash or plaintext token', async () => {
      const mockProject = {
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(ownerId),
        isArchived: false,
        gateTokens: [
          {
            _id: new Types.ObjectId(),
            name: 'Pipeline Token',
            tokenPrefix: 'documan_gate_1234',
            tokenHash: 'secret_hash',
            createdBy: new Types.ObjectId(ownerId),
            createdAt: new Date(),
          },
        ],
      };

      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);

      const tokens = await getProjectGateTokens(ownerId, 'user', projectId);

      expect(tokens.length).toBe(1);
      expect((tokens[0] as any).tokenHash).toBeUndefined();
      expect((tokens[0] as any).token).toBeUndefined();
      expect(tokens[0]!.tokenPrefix).toBe('documan_gate_1234');
    });

    it('should revoke gate token when requested by owner', async () => {
      const tokenId = new Types.ObjectId();
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockToken = {
        _id: tokenId,
        name: 'Revoke Test',
        revokedAt: null,
      };
      const mockProject = {
        _id: new Types.ObjectId(projectId),
        ownerId: new Types.ObjectId(ownerId),
        isArchived: false,
        gateTokens: [mockToken],
        save: mockSave,
      };

      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);

      const res = await revokeProjectGateToken(ownerId, 'user', projectId, tokenId.toString());

      expect(res.revokedAt).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
