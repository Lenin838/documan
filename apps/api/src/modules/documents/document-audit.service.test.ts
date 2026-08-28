import { Types } from 'mongoose';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDocumentAudit, mockDocument } = vi.hoisted(() => ({
  mockDocumentAudit: {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
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

  it('should return default paginated audit history for a document', async () => {
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

    const limitMock = vi.fn().mockResolvedValue(audits);
    const skipMock = vi.fn().mockReturnValue({ limit: limitMock });
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock });

    mockDocumentAudit.find.mockReturnValue({ sort: sortMock });
    mockDocumentAudit.countDocuments.mockResolvedValue(2);

    const result = await getDocumentAuditHistory(
      USER_ID,
      'user',
      DOCUMENT_ID,
    );

    expect(mockDocumentAudit.find).toHaveBeenCalledWith({
      documentId: expect.any(Types.ObjectId),
    });

    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skipMock).toHaveBeenCalledWith(0);
    expect(limitMock).toHaveBeenCalledWith(10);
    expect(mockDocumentAudit.countDocuments).toHaveBeenCalledWith({
      documentId: expect.any(Types.ObjectId),
    });

    expect(result).toEqual({
      auditHistory: audits,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    });
  });

  it('should apply custom pagination parameters', async () => {
    const audits = [
      {
        documentId: new Types.ObjectId(DOCUMENT_ID),
        userId: new Types.ObjectId(USER_ID),
        action: 'UPDATE',
      },
    ];

    mockDocument.findOne.mockResolvedValue({
      _id: new Types.ObjectId(DOCUMENT_ID),
      ownerId: new Types.ObjectId(USER_ID),
      isDeleted: false,
    });

    const limitMock = vi.fn().mockResolvedValue(audits);
    const skipMock = vi.fn().mockReturnValue({ limit: limitMock });
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock });

    mockDocumentAudit.find.mockReturnValue({ sort: sortMock });
    mockDocumentAudit.countDocuments.mockResolvedValue(15);

    const result = await getDocumentAuditHistory(
      USER_ID,
      'user',
      DOCUMENT_ID,
      { page: 2, limit: 5 },
    );

    expect(skipMock).toHaveBeenCalledWith(5);
    expect(limitMock).toHaveBeenCalledWith(5);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 15,
      totalPages: 3,
    });
  });

  it('should filter audit history by action', async () => {
    const audits = [
      {
        documentId: new Types.ObjectId(DOCUMENT_ID),
        userId: new Types.ObjectId(USER_ID),
        action: 'UPDATE',
      },
    ];

    mockDocument.findOne.mockResolvedValue({
      _id: new Types.ObjectId(DOCUMENT_ID),
      ownerId: new Types.ObjectId(USER_ID),
      isDeleted: false,
    });

    const limitMock = vi.fn().mockResolvedValue(audits);
    const skipMock = vi.fn().mockReturnValue({ limit: limitMock });
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock });

    mockDocumentAudit.find.mockReturnValue({ sort: sortMock });
    mockDocumentAudit.countDocuments.mockResolvedValue(1);

    const result = await getDocumentAuditHistory(
      USER_ID,
      'user',
      DOCUMENT_ID,
      { page: 1, limit: 10, action: 'UPDATE' },
    );

    expect(mockDocumentAudit.find).toHaveBeenCalledWith({
      documentId: expect.any(Types.ObjectId),
      action: 'UPDATE',
    });

    expect(mockDocumentAudit.countDocuments).toHaveBeenCalledWith({
      documentId: expect.any(Types.ObjectId),
      action: 'UPDATE',
    });

    expect(result.auditHistory).toEqual(audits);
  });

  it('should return empty paginated result when no audit history exists', async () => {
    mockDocument.findOne.mockResolvedValue({
      _id: new Types.ObjectId(DOCUMENT_ID),
      ownerId: new Types.ObjectId(USER_ID),
      isDeleted: false,
    });

    const limitMock = vi.fn().mockResolvedValue([]);
    const skipMock = vi.fn().mockReturnValue({ limit: limitMock });
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock });

    mockDocumentAudit.find.mockReturnValue({ sort: sortMock });
    mockDocumentAudit.countDocuments.mockResolvedValue(0);

    const result = await getDocumentAuditHistory(
      USER_ID,
      'user',
      DOCUMENT_ID,
    );

    expect(result).toEqual({
      auditHistory: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });
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
      ownerId: new Types.ObjectId('507f1f77bcf86cd799439012'),
      isDeleted: false,
    });

    const audits = [
      {
        documentId: new Types.ObjectId(DOCUMENT_ID),
        userId: new Types.ObjectId(USER_ID),
        action: 'CREATE',
      },
    ];

    const limitMock = vi.fn().mockResolvedValue(audits);
    const skipMock = vi.fn().mockReturnValue({ limit: limitMock });
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock });

    mockDocumentAudit.find.mockReturnValue({ sort: sortMock });
    mockDocumentAudit.countDocuments.mockResolvedValue(1);

    const result = await getDocumentAuditHistory(
      USER_ID,
      'admin',
      DOCUMENT_ID,
    );

    expect(result.auditHistory).toEqual(audits);
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