import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentShare } from './document-share.model.js';
import {
  createDocumentShare,
  getDocumentShares,
  revokeDocumentShare,
  updateDocumentShare,
} from './document-share.service.js';
import { AppError } from '../../errors/app-error.js';
import { Document } from '../documents/document.model.js';
import { User } from '../users/user.model.js';

vi.mock('../documents/document.model.js', () => ({
  Document: {
    findOne: vi.fn(),
  },
}));

vi.mock('../users/user.model.js', () => ({
  User: {
    findOne: vi.fn(),
  },
}));

vi.mock('./document-share.model.js', () => ({
  DocumentShare: {
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

describe('Document Share Service', () => {
  const OWNER_ID = '507f1f77bcf86cd799439011';
  const TARGET_USER_ID = '507f1f77bcf86cd799439022';
  const DOCUMENT_ID = '507f1f77bcf86cd799439033';
  const SHARE_ID = '507f1f77bcf86cd799439044';

  const mockDocument = {
    _id: new Types.ObjectId(DOCUMENT_ID),
    title: 'Test Doc',
    ownerId: new Types.ObjectId(OWNER_ID),
    isDeleted: false,
  };

  const mockTargetUser = {
    _id: new Types.ObjectId(TARGET_USER_ID),
    name: 'Target User',
    email: 'target@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDocumentShare', () => {
    it('creates a share successfully', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as any);
      vi.mocked(User.findOne).mockResolvedValue(mockTargetUser as any);

      const mockShare = {
        _id: new Types.ObjectId(SHARE_ID),
        documentId: new Types.ObjectId(DOCUMENT_ID),
        sharedWithUserId: new Types.ObjectId(TARGET_USER_ID),
        permission: 'READ',
        createdBy: new Types.ObjectId(OWNER_ID),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(DocumentShare.findOneAndUpdate).mockResolvedValue(mockShare as any);

      const result = await createDocumentShare(OWNER_ID, 'user', DOCUMENT_ID, {
        email: 'target@example.com',
        permission: 'READ',
      });

      expect(result.id).toBe(SHARE_ID);
      expect(result.sharedWithUser.email).toBe('target@example.com');
      expect(result.permission).toBe('READ');
    });

    it('prevents self sharing', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as any);

      const mockOwnerUser = {
        _id: new Types.ObjectId(OWNER_ID),
        name: 'Owner User',
        email: 'owner@example.com',
      };

      vi.mocked(User.findOne).mockResolvedValue(mockOwnerUser as any);

      await expect(
        createDocumentShare(OWNER_ID, 'user', DOCUMENT_ID, {
          email: 'owner@example.com',
          permission: 'READ',
        }),
      ).rejects.toThrow(
        new AppError('Cannot share document with yourself', 400, 'SELF_SHARING_NOT_ALLOWED'),
      );
    });

    it('throws error when target user does not exist', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as any);
      vi.mocked(User.findOne).mockResolvedValue(null);

      await expect(
        createDocumentShare(OWNER_ID, 'user', DOCUMENT_ID, {
          email: 'nonexistent@example.com',
          permission: 'READ',
        }),
      ).rejects.toThrow(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    });
  });

  describe('getDocumentShares', () => {
    it('returns shares list for a document', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as any);

      const mockShares = [
        {
          _id: new Types.ObjectId(SHARE_ID),
          documentId: new Types.ObjectId(DOCUMENT_ID),
          sharedWithUserId: {
            _id: new Types.ObjectId(TARGET_USER_ID),
            name: 'Target User',
            email: 'target@example.com',
          },
          permission: 'READ',
          createdBy: new Types.ObjectId(OWNER_ID),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(DocumentShare.find).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockResolvedValue(mockShares),
        }),
      } as any);

      const result = await getDocumentShares(OWNER_ID, 'user', DOCUMENT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]!.sharedWithUser.email).toBe('target@example.com');
    });
  });

  describe('revokeDocumentShare', () => {
    it('revokes share access', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as any);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        _id: new Types.ObjectId(SHARE_ID),
        documentId: new Types.ObjectId(DOCUMENT_ID),
      } as any);
      vi.mocked(DocumentShare.deleteOne).mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);

      const result = await revokeDocumentShare(OWNER_ID, 'user', DOCUMENT_ID, SHARE_ID);

      expect(result.message).toBe('Share revoked successfully');
      expect(DocumentShare.deleteOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(SHARE_ID),
      });
    });
  });
});
