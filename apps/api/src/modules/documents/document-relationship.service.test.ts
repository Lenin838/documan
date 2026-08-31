/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentRelationship } from './document-relationship.model.js';
import {
  createDocumentRelationship,
  getDocumentRelationships,
  deleteDocumentRelationship,
} from './document-relationship.service.js';
import { Document } from './document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import * as auditService from './document-audit.service.js';
import { AppError } from '../../errors/app-error.js';

vi.mock('./document.model.js', () => ({
  Document: {
    findOne: vi.fn(),
  },
}));

vi.mock('../document-shares/document-share.model.js', () => ({
  DocumentShare: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('./document-relationship.model.js', () => ({
  DocumentRelationship: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('./document-audit.service.js', () => ({
  createDocumentAudit: vi.fn().mockResolvedValue({}),
}));

describe('Document Relationship Service', () => {
  const USER_ID = '507f1f77bcf86cd799439011';
  const OTHER_USER_ID = '507f1f77bcf86cd799439022';
  const DOC_A_ID = '507f1f77bcf86cd799439033';
  const DOC_B_ID = '507f1f77bcf86cd799439044';
  const REL_ID = '507f1f77bcf86cd799439055';

  const mockDocA = {
    _id: new Types.ObjectId(DOC_A_ID),
    title: 'Payment API Guide',
    fileName: 'payment_api.pdf',
    fileType: 'application/pdf',
    ownerId: new Types.ObjectId(USER_ID),
    isDeleted: false,
  };

  const mockDocB = {
    _id: new Types.ObjectId(DOC_B_ID),
    title: 'Authentication Guide',
    fileName: 'auth_guide.pdf',
    fileType: 'application/pdf',
    ownerId: new Types.ObjectId(USER_ID),
    isDeleted: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DocumentShare.find).mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    } as any);
  });

  describe('createDocumentRelationship', () => {
    it('creates a relationship successfully', async () => {
      vi.mocked(Document.findOne).mockImplementation(((filter: any) => {
        if (filter._id === DOC_A_ID) return Promise.resolve(mockDocA);
        if (filter._id === DOC_B_ID) return Promise.resolve(mockDocB);
        return Promise.resolve(null);
      }) as any);

      vi.mocked(DocumentRelationship.findOne).mockResolvedValue(null as any);

      const mockCreatedRel = {
        _id: new Types.ObjectId(REL_ID),
        sourceDocumentId: mockDocA._id,
        targetDocumentId: mockDocB._id,
        type: 'REFERENCES',
        createdBy: new Types.ObjectId(USER_ID),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(DocumentRelationship.create).mockResolvedValue(mockCreatedRel as any);

      const result = await createDocumentRelationship(USER_ID, 'user', DOC_A_ID, {
        targetDocumentId: DOC_B_ID,
        type: 'REFERENCES',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(REL_ID);
      expect(result.sourceDocumentId).toBe(DOC_A_ID);
      expect(result.targetDocumentId).toBe(DOC_B_ID);
      expect(result.type).toBe('REFERENCES');
      expect(result.direction).toBe('OUTGOING');
      expect(result.relatedDocument.id).toBe(DOC_B_ID);

      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        DOC_A_ID,
        USER_ID,
        'RELATIONSHIP_CREATE',
        expect.objectContaining({
          targetDocumentId: DOC_B_ID,
          relationshipType: 'REFERENCES',
          relationshipId: REL_ID,
        }),
      );
    });

    it('rejects self-relationship', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocA as any);

      await expect(
        createDocumentRelationship(USER_ID, 'user', DOC_A_ID, {
          targetDocumentId: DOC_A_ID,
          type: 'RELATED',
        }),
      ).rejects.toThrow(AppError);

      await expect(
        createDocumentRelationship(USER_ID, 'user', DOC_A_ID, {
          targetDocumentId: DOC_A_ID,
          type: 'RELATED',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'CANNOT_RELATE_TO_SELF',
      });
    });

    it('rejects duplicate relationship', async () => {
      vi.mocked(Document.findOne).mockImplementation(((filter: any) => {
        if (filter._id === DOC_A_ID) return Promise.resolve(mockDocA);
        if (filter._id === DOC_B_ID) return Promise.resolve(mockDocB);
        return Promise.resolve(null);
      }) as any);

      vi.mocked(DocumentRelationship.findOne).mockResolvedValue({ _id: REL_ID } as any);

      await expect(
        createDocumentRelationship(USER_ID, 'user', DOC_A_ID, {
          targetDocumentId: DOC_B_ID,
          type: 'REFERENCES',
        }),
      ).rejects.toThrow(AppError);

      await expect(
        createDocumentRelationship(USER_ID, 'user', DOC_A_ID, {
          targetDocumentId: DOC_B_ID,
          type: 'REFERENCES',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'RELATIONSHIP_ALREADY_EXISTS',
      });
    });

    it('throws 404 when source document is not found', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(null);

      await expect(
        createDocumentRelationship(USER_ID, 'user', DOC_A_ID, {
          targetDocumentId: DOC_B_ID,
          type: 'DEPENDS_ON',
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'DOCUMENT_NOT_FOUND',
      });
    });

    it('throws 404 when target document is not found', async () => {
      vi.mocked(Document.findOne).mockImplementation(((filter: any) => {
        if (filter._id === DOC_A_ID) return Promise.resolve(mockDocA);
        return Promise.resolve(null);
      }) as any);

      await expect(
        createDocumentRelationship(USER_ID, 'user', DOC_A_ID, {
          targetDocumentId: DOC_B_ID,
          type: 'DEPENDS_ON',
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'DOCUMENT_NOT_FOUND',
      });
    });

    it('throws 403 when user only has READ permission on source document', async () => {
      const docOwnedByOther = { ...mockDocA, ownerId: new Types.ObjectId(OTHER_USER_ID) };
      vi.mocked(Document.findOne).mockResolvedValue(docOwnedByOther as any);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        permission: 'READ',
      } as any);

      await expect(
        createDocumentRelationship(USER_ID, 'user', DOC_A_ID, {
          targetDocumentId: DOC_B_ID,
          type: 'REFERENCES',
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN',
      });
    });
  });

  describe('getDocumentRelationships', () => {
    it('retrieves relationships with correct direction for source document (OUTGOING)', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocA as any);

      const mockRel = {
        _id: new Types.ObjectId(REL_ID),
        sourceDocumentId: mockDocA,
        targetDocumentId: mockDocB,
        type: 'REFERENCES',
        createdBy: new Types.ObjectId(USER_ID),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const populateMock = vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockRel]),
      });

      vi.mocked(DocumentRelationship.find).mockReturnValue({
        populate: populateMock,
      } as any);

      const results = await getDocumentRelationships(USER_ID, 'user', DOC_A_ID);

      expect(results).toHaveLength(1);
      expect(results[0]?.direction).toBe('OUTGOING');
      expect(results[0]?.sourceDocumentId).toBe(DOC_A_ID);
      expect(results[0]?.targetDocumentId).toBe(DOC_B_ID);
      expect(results[0]?.relatedDocument.id).toBe(DOC_B_ID);
    });

    it('retrieves relationships with correct direction for target document (INCOMING)', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocB as any);

      const mockRel = {
        _id: new Types.ObjectId(REL_ID),
        sourceDocumentId: mockDocA,
        targetDocumentId: mockDocB,
        type: 'DEPENDS_ON',
        createdBy: new Types.ObjectId(USER_ID),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const populateMock = vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockRel]),
      });

      vi.mocked(DocumentRelationship.find).mockReturnValue({
        populate: populateMock,
      } as any);

      const results = await getDocumentRelationships(USER_ID, 'user', DOC_B_ID);

      expect(results).toHaveLength(1);
      expect(results[0]?.direction).toBe('INCOMING');
      expect(results[0]?.sourceDocumentId).toBe(DOC_A_ID);
      expect(results[0]?.targetDocumentId).toBe(DOC_B_ID);
      expect(results[0]?.relatedDocument.id).toBe(DOC_A_ID);
    });

    it('filters out soft-deleted documents', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocA as any);

      const deletedDocB = { ...mockDocB, isDeleted: true };
      const mockRel = {
        _id: new Types.ObjectId(REL_ID),
        sourceDocumentId: mockDocA,
        targetDocumentId: deletedDocB,
        type: 'REFERENCES',
        createdBy: new Types.ObjectId(USER_ID),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const populateMock = vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([mockRel]),
      });

      vi.mocked(DocumentRelationship.find).mockReturnValue({
        populate: populateMock,
      } as any);

      const results = await getDocumentRelationships(USER_ID, 'user', DOC_A_ID);
      expect(results).toHaveLength(0);
    });
  });

  describe('deleteDocumentRelationship', () => {
    it('deletes relationship successfully when user has EDIT access and relationship belongs to primary document', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocA as any);

      const mockRel = {
        _id: new Types.ObjectId(REL_ID),
        sourceDocumentId: mockDocA._id,
        targetDocumentId: mockDocB._id,
        type: 'REPLACES',
      };

      vi.mocked(DocumentRelationship.findById).mockResolvedValue(mockRel as any);
      vi.mocked(DocumentRelationship.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

      const result = await deleteDocumentRelationship(USER_ID, 'user', DOC_A_ID, REL_ID);

      expect(result).toEqual({ message: 'Relationship deleted successfully' });
      expect(DocumentRelationship.deleteOne).toHaveBeenCalledWith({ _id: mockRel._id });
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        DOC_A_ID,
        USER_ID,
        'RELATIONSHIP_DELETE',
        expect.objectContaining({
          targetDocumentId: DOC_B_ID,
          relationshipType: 'REPLACES',
          relationshipId: REL_ID,
        }),
      );
    });

    it('rejects deletion if relationship does NOT belong to primary document parameter :id', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocA as any);

      const UNRELATED_DOC_1 = new Types.ObjectId('507f1f77bcf86cd799439088');
      const UNRELATED_DOC_2 = new Types.ObjectId('507f1f77bcf86cd799439099');

      const mockUnrelatedRel = {
        _id: new Types.ObjectId(REL_ID),
        sourceDocumentId: UNRELATED_DOC_1,
        targetDocumentId: UNRELATED_DOC_2,
        type: 'REFERENCES',
      };

      vi.mocked(DocumentRelationship.findById).mockResolvedValue(mockUnrelatedRel as any);

      await expect(
        deleteDocumentRelationship(USER_ID, 'user', DOC_A_ID, REL_ID),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'RELATIONSHIP_NOT_FOUND',
      });

      expect(DocumentRelationship.deleteOne).not.toHaveBeenCalled();
    });

    it('throws 404 when relationship does not exist', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocA as any);
      vi.mocked(DocumentRelationship.findById).mockResolvedValue(null);

      await expect(
        deleteDocumentRelationship(USER_ID, 'user', DOC_A_ID, REL_ID),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'RELATIONSHIP_NOT_FOUND',
      });
    });
  });
});
