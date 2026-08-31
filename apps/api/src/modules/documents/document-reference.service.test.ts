import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import {
  createDocumentReference,
  getDocumentReferences,
  updateDocumentReference,
  deleteDocumentReference,
} from './document-reference.service.js';
import { DocumentReference } from './document-reference.model.js';
import { Document } from './document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import * as auditService from './document-audit.service.js';

vi.mock('./document-reference.model.js', () => ({
  DocumentReference: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('./document.model.js', () => ({
  Document: {
    findOne: vi.fn(),
  },
}));

vi.mock('../document-shares/document-share.model.js', () => ({
  DocumentShare: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('./document-audit.service.js', () => ({
  createDocumentAudit: vi.fn().mockResolvedValue({}),
}));

describe('document-reference.service', () => {
  const ownerId = new Types.ObjectId('507f1f77bcf86cd799439011');
  const readUserId = new Types.ObjectId('507f1f77bcf86cd799439022');
  const editUserId = new Types.ObjectId('507f1f77bcf86cd799439033');
  const unauthorizedUserId = new Types.ObjectId('507f1f77bcf86cd799439044');
  const documentId = new Types.ObjectId('507f1f77bcf86cd799439055');
  const referenceId = new Types.ObjectId('507f1f77bcf86cd799439066');

  const mockDocument = {
    _id: documentId,
    title: 'Architecture Doc',
    fileName: 'arch.pdf',
    fileType: 'pdf',
    ownerId,
    isDeleted: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDocumentReference', () => {
    it('allows document owner to create technical reference', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentReference.findOne).mockResolvedValue(null);
      vi.mocked(DocumentReference.create).mockResolvedValue({
        _id: referenceId,
        documentId,
        type: 'API',
        title: 'OpenAPI Endpoint',
        url: 'https://api.documan.io/v1',
        createdBy: ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await createDocumentReference(
        ownerId.toString(),
        'user',
        documentId.toString(),
        {
          type: 'API',
          title: 'OpenAPI Endpoint',
          url: 'https://api.documan.io/v1',
        },
      );

      expect(result.id).toBe(referenceId.toString());
      expect(result.type).toBe('API');
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        documentId.toString(),
        ownerId.toString(),
        'TECHNICAL_REFERENCE_CREATE',
        expect.objectContaining({ referenceId: referenceId.toString() }),
      );
    });

    it('allows user with shared EDIT permission to create reference', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: editUserId,
        permission: 'EDIT',
      } as never);
      vi.mocked(DocumentReference.findOne).mockResolvedValue(null);
      vi.mocked(DocumentReference.create).mockResolvedValue({
        _id: referenceId,
        documentId,
        type: 'REPOSITORY',
        title: 'GitHub Repo',
        url: 'https://github.com/org/repo',
        createdBy: editUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const result = await createDocumentReference(
        editUserId.toString(),
        'user',
        documentId.toString(),
        {
          type: 'REPOSITORY',
          title: 'GitHub Repo',
          url: 'https://github.com/org/repo',
        },
      );

      expect(result.id).toBe(referenceId.toString());
    });

    it('rejects creation from user with shared READ permission', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: readUserId,
        permission: 'READ',
      } as never);

      await expect(
        createDocumentReference(
          readUserId.toString(),
          'user',
          documentId.toString(),
          {
            type: 'SPECIFICATION',
            title: 'RFC Spec',
            url: 'https://rfc.org/spec',
          },
        ),
      ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    });

    it('rejects duplicate reference creation on same document', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentReference.findOne).mockResolvedValue({
        _id: referenceId,
        type: 'API',
        url: 'https://api.documan.io/v1',
      } as never);

      await expect(
        createDocumentReference(
          ownerId.toString(),
          'user',
          documentId.toString(),
          {
            type: 'API',
            title: 'Duplicate API',
            url: 'https://api.documan.io/v1',
          },
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'REFERENCE_ALREADY_EXISTS',
      });
    });
  });

  describe('getDocumentReferences', () => {
    it('allows shared READ user to view references', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue({
        documentId,
        sharedWithUserId: readUserId,
        permission: 'READ',
      } as never);
      vi.mocked(DocumentReference.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            _id: referenceId,
            documentId,
            type: 'ISSUE',
            title: 'Jira Issue',
            url: 'https://jira.com/DOC-123',
            createdBy: ownerId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      } as never);

      const references = await getDocumentReferences(
        readUserId.toString(),
        'user',
        documentId.toString(),
      );

      expect(references).toHaveLength(1);
      expect(references[0]?.type).toBe('ISSUE');
    });

    it('returns 404 DOCUMENT_NOT_FOUND to unauthorized user attempting to list references', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentShare.findOne).mockResolvedValue(null);

      await expect(
        getDocumentReferences(
          unauthorizedUserId.toString(),
          'user',
          documentId.toString(),
        ),
      ).rejects.toMatchObject({ statusCode: 404, code: 'DOCUMENT_NOT_FOUND' });
    });
  });

  describe('updateDocumentReference', () => {
    it('allows owner to update reference and rejects duplicates', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      const mockRefObj = {
        _id: referenceId,
        documentId,
        type: 'API',
        title: 'Old Title',
        url: 'https://old.url',
        createdBy: ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(DocumentReference.findOne)
        .mockResolvedValueOnce(mockRefObj as never) // find existing reference
        .mockResolvedValueOnce(null); // duplicate check passes

      const updated = await updateDocumentReference(
        ownerId.toString(),
        'user',
        documentId.toString(),
        referenceId.toString(),
        { title: 'New Title' },
      );

      expect(updated.title).toBe('New Title');
      expect(mockRefObj.save).toHaveBeenCalled();
    });

    it('rejects update if reference belongs to another document or not found', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentReference.findOne).mockResolvedValue(null);

      await expect(
        updateDocumentReference(
          ownerId.toString(),
          'user',
          documentId.toString(),
          referenceId.toString(),
          { title: 'New Title' },
        ),
      ).rejects.toMatchObject({ statusCode: 404, code: 'REFERENCE_NOT_FOUND' });
    });
  });

  describe('deleteDocumentReference', () => {
    it('allows owner to delete reference', async () => {
      vi.mocked(Document.findOne).mockResolvedValue(mockDocument as never);
      vi.mocked(DocumentReference.findOne).mockResolvedValue({
        _id: referenceId,
        documentId,
        type: 'OTHER',
        title: 'Doc link',
        url: 'https://example.com',
      } as never);

      const res = await deleteDocumentReference(
        ownerId.toString(),
        'user',
        documentId.toString(),
        referenceId.toString(),
      );

      expect(res.message).toBe('Technical reference removed successfully');
      expect(DocumentReference.deleteOne).toHaveBeenCalledWith({
        _id: referenceId,
      });
      expect(auditService.createDocumentAudit).toHaveBeenCalledWith(
        documentId.toString(),
        ownerId.toString(),
        'TECHNICAL_REFERENCE_DELETE',
        expect.anything(),
      );
    });
  });
});
