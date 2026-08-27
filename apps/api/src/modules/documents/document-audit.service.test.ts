import { Types } from 'mongoose';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDocumentAudit, mockDocument } = vi.hoisted(() => ({
  mockDocumentAudit: {
    create: vi.fn(),
    find: vi.fn(),
  },

  mockDocument: {
    findOne: vi.fn(),
  },
}));

vi.mock('./document-audit.model.js', () => ({
  DocumentAudit: mockDocumentAudit,
}));

vi.mock('./document.model.js', () => ({
  Document: mockDocument,
}));

import {
    createDocumentAudit,
    getDocumentAuditHistory,
 } from './document-audit.service.js';

const DOCUMENT_ID = new Types.ObjectId().toString();
const USER_ID = new Types.ObjectId().toString();

describe('createDocumentAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a document audit', async () => {
    const audit = {
      _id: new Types.ObjectId(),
      documentId: new Types.ObjectId(DOCUMENT_ID),
      userId: new Types.ObjectId(USER_ID),
      action: 'CREATE',
    };

    mockDocumentAudit.create.mockResolvedValue(audit);

    const result = await createDocumentAudit(
      DOCUMENT_ID,
      USER_ID,
      'CREATE',
    );

    expect(mockDocumentAudit.create).toHaveBeenCalledWith({
      documentId: expect.any(Types.ObjectId),
      userId: expect.any(Types.ObjectId),
      action: 'CREATE',
    });

    expect(result).toBe(audit);
  });

  it('should create an audit with metadata', async () => {
    const metadata = {
      oldFileName: 'old.pdf',
      newFileName: 'new.pdf',
    };

    mockDocumentAudit.create.mockResolvedValue({
      action: 'FILE_REPLACE',
      metadata,
    });

    const result = await createDocumentAudit(
      DOCUMENT_ID,
      USER_ID,
      'FILE_REPLACE',
      metadata,
    );

    expect(mockDocumentAudit.create).toHaveBeenCalledWith({
      documentId: expect.any(Types.ObjectId),
      userId: expect.any(Types.ObjectId),
      action: 'FILE_REPLACE',
      metadata,
    });

    expect(result).toMatchObject({
      action: 'FILE_REPLACE',
      metadata,
    });
  });

  it('should throw when document id is invalid', async () => {
    await expect(
      createDocumentAudit(
        'invalid-document-id',
        USER_ID,
        'CREATE',
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });

    expect(mockDocumentAudit.create).not.toHaveBeenCalled();
  });

  it('should throw when user id is invalid', async () => {
    await expect(
      createDocumentAudit(
        DOCUMENT_ID,
        'invalid-user-id',
        'CREATE',
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });

    expect(mockDocumentAudit.create).not.toHaveBeenCalled();
  });
});

describe('getDocumentAuditHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return audit history for a document', async () => {
    const audits = [
      {
        documentId: new Types.ObjectId(DOCUMENT_ID),
        userId: new Types.ObjectId(USER_ID),
        action: 'UPDATE',
        createdAt: new Date('2026-01-02'),
      },
      {
        documentId: new Types.ObjectId(DOCUMENT_ID),
        userId: new Types.ObjectId(USER_ID),
        action: 'CREATE',
        createdAt: new Date('2026-01-01'),
      },
    ];

    mockDocument.findOne.mockResolvedValue({
        _id: new Types.ObjectId(DOCUMENT_ID),
        ownerId: new Types.ObjectId(USER_ID),
        isDeleted: false,
    });

    mockDocumentAudit.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue(audits),
    });

    const result = await getDocumentAuditHistory(
        USER_ID,
        'user',
        DOCUMENT_ID,
    )

    expect(mockDocumentAudit.find).toHaveBeenCalledWith({
      documentId: expect.any(Types.ObjectId),
    });

    expect(result).toEqual(audits);
  });

  it('should return an empty array when document has no audit history', async () => {
    mockDocument.findOne.mockResolvedValue({
        _id: new Types.ObjectId(DOCUMENT_ID),
        ownerId: new Types.ObjectId(USER_ID),
        isDeleted: false,
    });

    mockDocumentAudit.find.mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    });

    const result = await getDocumentAuditHistory(
        USER_ID,
        'user',
        DOCUMENT_ID,
    )

    expect(result).toEqual([]);
  });

  it('should not allow a user to view another user document audit history', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
        getDocumentAuditHistory(
        USER_ID,
        'user',
        DOCUMENT_ID,
        ),
    ).rejects.toMatchObject({
        statusCode: 404,
        code: 'DOCUMENT_NOT_FOUND',
    });

    expect(mockDocumentAudit.find).not.toHaveBeenCalled();
  });

  it('should allow an admin to view any document audit history', async () => {
    mockDocument.findOne.mockResolvedValue({
        _id: new Types.ObjectId(DOCUMENT_ID),
        ownerId: new Types.ObjectId(
        '507f1f77bcf86cd799439012',
        ),
        isDeleted: false,
    });

    const audits = [
        {
        documentId: new Types.ObjectId(DOCUMENT_ID),
        userId: new Types.ObjectId(USER_ID),
        action: 'CREATE',
        },
    ];

    mockDocumentAudit.find.mockReturnValue({
        sort: vi.fn().mockResolvedValue(audits),
    });

    const result = await getDocumentAuditHistory(
        USER_ID,
        'admin',
        DOCUMENT_ID,
    );

    expect(result).toEqual(audits);
  });

  it('should throw when document id is invalid', async () => {
    await expect(
        getDocumentAuditHistory(
        USER_ID,
        'user',
        'invalid-document-id',
        ),
    ).rejects.toMatchObject({
        statusCode: 404,
        code: 'DOCUMENT_NOT_FOUND',
    });

    expect(mockDocument.findOne).not.toHaveBeenCalled();
    expect(mockDocumentAudit.find).not.toHaveBeenCalled();
  });
});