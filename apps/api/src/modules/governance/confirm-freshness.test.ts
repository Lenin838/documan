/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import { Document } from '../documents/document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { confirmDocumentFreshness } from './governance.service.js';
import * as auditService from '../documents/document-audit.service.js';

vi.mock('../documents/document-audit.service.js', () => ({
  createDocumentAudit: vi.fn(),
}));

describe('Confirm Freshness Service & Authorization', () => {
  const ownerId = new Types.ObjectId().toString();
  const editUserId = new Types.ObjectId().toString();
  const readUserId = new Types.ObjectId().toString();
  const documentId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization Matrix', () => {
    it('should allow Document Owner to confirm freshness', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockDoc: Record<string, unknown> = {
        _id: new Types.ObjectId(documentId),
        title: 'Doc Spec',
        ownerId: new Types.ObjectId(ownerId),
        status: 'STALE',
        isDeleted: false,
        lastReviewedAt: undefined,
        save: mockSave,
      };

      vi.spyOn(Document, 'findOne').mockResolvedValue(mockDoc as any);

      const res = await confirmDocumentFreshness(ownerId, 'user', documentId);

      expect(res.status).toBe('APPROVED');
      expect(mockDoc.lastReviewedAt).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
      expect(auditService.createDocumentAudit).toHaveBeenCalled();
    });

    it('should allow Shared EDIT user to confirm freshness', async () => {
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockDoc: Record<string, unknown> = {
        _id: new Types.ObjectId(documentId),
        title: 'Doc Spec',
        ownerId: new Types.ObjectId(ownerId),
        status: 'STALE',
        isDeleted: false,
        lastReviewedAt: undefined,
        save: mockSave,
      };

      vi.spyOn(Document, 'findOne').mockResolvedValue(mockDoc as any);
      vi.spyOn(DocumentShare, 'findOne').mockResolvedValue({
        documentId: new Types.ObjectId(documentId),
        sharedWithUserId: new Types.ObjectId(editUserId),
        permission: 'EDIT',
      } as any);

      const res = await confirmDocumentFreshness(editUserId, 'user', documentId);

      expect(res.status).toBe('APPROVED');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw 403 Forbidden for Shared READ user', async () => {
      const mockDoc = {
        _id: new Types.ObjectId(documentId),
        title: 'Doc Spec',
        ownerId: new Types.ObjectId(ownerId),
        status: 'STALE',
        isDeleted: false,
      };

      vi.spyOn(Document, 'findOne').mockResolvedValue(mockDoc as any);
      vi.spyOn(DocumentShare, 'findOne')
        .mockResolvedValueOnce(null) // EDIT share check
        .mockResolvedValueOnce({
          documentId: new Types.ObjectId(documentId),
          sharedWithUserId: new Types.ObjectId(readUserId),
          permission: 'READ',
        } as any); // READ share check

      await expect(
        confirmDocumentFreshness(readUserId, 'user', documentId),
      ).rejects.toThrow('Forbidden: Confirming document freshness requires EDIT permission');
    });
  });

  describe('Prohibited Status Transitions', () => {
    it('should reject DRAFT documents with 400 Bad Request', async () => {
      const mockDoc = {
        _id: new Types.ObjectId(documentId),
        title: 'Draft Spec',
        ownerId: new Types.ObjectId(ownerId),
        status: 'DRAFT',
        isDeleted: false,
      };

      vi.spyOn(Document, 'findOne').mockResolvedValue(mockDoc as any);

      await expect(
        confirmDocumentFreshness(ownerId, 'user', documentId),
      ).rejects.toThrow('DRAFT documents must complete a formal review to become APPROVED');
    });

    it('should reject DEPRECATED documents with 400 Bad Request', async () => {
      const mockDoc = {
        _id: new Types.ObjectId(documentId),
        title: 'Deprecated Spec',
        ownerId: new Types.ObjectId(ownerId),
        status: 'DEPRECATED',
        isDeleted: false,
      };

      vi.spyOn(Document, 'findOne').mockResolvedValue(mockDoc as any);

      await expect(
        confirmDocumentFreshness(ownerId, 'user', documentId),
      ).rejects.toThrow('Cannot confirm freshness of a DEPRECATED document');
    });
  });
});
