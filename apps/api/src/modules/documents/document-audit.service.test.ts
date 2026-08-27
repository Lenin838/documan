import { Types } from 'mongoose';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDocumentAudit } = vi.hoisted(() => ({
  mockDocumentAudit: {
    create: vi.fn(),
  },
}));

vi.mock('./document-audit.model.js', () => ({
  DocumentAudit: mockDocumentAudit,
}));

import { createDocumentAudit } from './document-audit.service.js';

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