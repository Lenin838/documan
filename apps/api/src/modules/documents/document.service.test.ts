import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import fs from 'node:fs/promises';

const { mockCreateDocumentAudit } = vi.hoisted(() => ({
  mockCreateDocumentAudit: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    access: vi.fn(),
    copyFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
  copyFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    promises: {
      copyFile: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
    },
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  promises: {
    copyFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('./document-audit.service.js', () => ({
  createDocumentAudit: mockCreateDocumentAudit,
}));

vi.mock('./document.model.js', () => ({
  Document: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('./document-version.model.js', () => ({
  DocumentVersion: {
    create: vi.fn().mockImplementation((val) => Promise.resolve({ ...val, _id: new Types.ObjectId() })),
    find: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  downloadDocument,
  viewDocument,
  restoreDocument,
} from './document.service.js';

import { Document } from './document.model.js';

const mockDocument = Document as unknown as {
  create: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  findOneAndUpdate: ReturnType<typeof vi.fn>;
  countDocuments: ReturnType<typeof vi.fn>;
};

const OWNER_ID = '507f1f77bcf86cd799439011';
const OTHER_OWNER_ID = '507f1f77bcf86cd799439012';
const DOCUMENT_ID = '507f1f77bcf86cd799439013';

function createDocumentMock(
  overrides: Record<string, unknown> = {},
) {
  return {
    _id: new Types.ObjectId(DOCUMENT_ID),
    title: 'Test Document',
    description: 'Test description',
    tags: ['engineering', 'spec'],
    version: 1,
    lastApprovedVersion: null,
    fileName: 'test.pdf',
    filePath: '/uploads/test.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    ownerId: new Types.ObjectId(OWNER_ID),
    isDeleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),

    save: vi.fn().mockResolvedValue(undefined),

    ...overrides,
  };
}

function createFindQueryMock(
  documents: ReturnType<typeof createDocumentMock>[],
) {
  return {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(documents),
  };
}

describe('createDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a document', async () => {
    const document = createDocumentMock();

    mockDocument.create.mockResolvedValue(document);

    const result = await createDocument(
      OWNER_ID,
      {
        title: 'Test Document',
        description: 'Test description',
      },
      {
        originalname: 'test.pdf',
        path: 'uploads/documents/test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      },
    );

    expect(mockDocument.create).toHaveBeenCalledWith({
      title: 'Test Document',
      description: 'Test description',
      folderId: null,
      projectId: null,
      tags: [],
      fileName: 'test.pdf',
      filePath: 'uploads/documents/test.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: expect.any(Types.ObjectId),
      isDeleted: false,
      version: 1,
      lastApprovedVersion: null,
    });

    expect(result).toMatchObject({
      id: DOCUMENT_ID,
      title: 'Test Document',
      description: 'Test description',
      fileName: 'test.pdf',
      filePath: '/uploads/test.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: OWNER_ID,
      isDeleted: false,
    });
    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'CREATE',
      undefined,
    );
  });

  it('should log template metadata when created with valid templateId', async () => {
    const document = createDocumentMock();
    mockDocument.create.mockResolvedValue(document);

    await createDocument(
      OWNER_ID,
      {
        title: 'ADR Document',
        templateId: 'adr',
      },
      {
        originalname: 'adr.md',
        path: 'uploads/documents/adr.md',
        mimetype: 'text/markdown',
        size: 512,
      },
    );

    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'CREATE',
      {
        templateId: 'adr',
        templateName: 'Architecture Decision Record',
      },
    );
  });

  it('should ignore template metadata when created with invalid templateId', async () => {
    const document = createDocumentMock();
    mockDocument.create.mockResolvedValue(document);

    await createDocument(
      OWNER_ID,
      {
        title: 'Document with Invalid Template',
        templateId: 'invalid-template-id',
      },
      {
        originalname: 'doc.md',
        path: 'uploads/documents/doc.md',
        mimetype: 'text/markdown',
        size: 512,
      },
    );

    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'CREATE',
      undefined,
    );
  });

  it('should create a document with normalized tags', async () => {
    const document = createDocumentMock({
      tags: ['engineering', 'spec'],
    });

    mockDocument.create.mockResolvedValue(document);

    const result = await createDocument(
      OWNER_ID,
      {
        title: 'Test Document',
        tags: [' Engineering ', 'SPEC', 'engineering'],
      },
      {
        originalname: 'test.pdf',
        path: 'uploads/documents/test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      },
    );

    expect(mockDocument.create).toHaveBeenCalledWith({
      title: 'Test Document',
      folderId: null,
      projectId: null,
      tags: ['engineering', 'spec'],
      fileName: 'test.pdf',
      filePath: 'uploads/documents/test.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: expect.any(Types.ObjectId),
      isDeleted: false,
      version: 1,
      lastApprovedVersion: null,
    });

    expect(result.tags).toEqual(['engineering', 'spec']);
  });

  it('should create a document without description', async () => {
    const document = createDocumentMock({
      description: undefined,
    });

    mockDocument.create.mockResolvedValue(document);

    const result = await createDocument(
      OWNER_ID,
      {
        title: 'Test Document',
      },
      {
        originalname: 'test.pdf',
        path: 'uploads/documents/test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      },
    );

    expect(mockDocument.create).toHaveBeenCalledWith({
      title: 'Test Document',
      folderId: null,
      projectId: null,
      tags: [],
      fileName: 'test.pdf',
      filePath: 'uploads/documents/test.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: expect.any(Types.ObjectId),
      isDeleted: false,
      version: 1,
      lastApprovedVersion: null,
    });

    expect(result.id).toBe(DOCUMENT_ID);

    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'CREATE',
      undefined,
    );
  });
});

describe('getAllDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return only the current user documents', async () => {
    const documents = [
      createDocumentMock(),
    ];

    mockDocument.find.mockReturnValue(
      createFindQueryMock(documents),
    );

    mockDocument.countDocuments.mockResolvedValue(1);

    const result = await getAllDocuments(
      OWNER_ID,
      'user',
      {
        page: 1,
        limit: 10,
      },
    );

    expect(mockDocument.find).toHaveBeenCalledWith({
      isDeleted: false,
      ownerId: expect.any(Types.ObjectId),
    });

    expect(mockDocument.countDocuments).toHaveBeenCalledWith({
      isDeleted: false,
      ownerId: expect.any(Types.ObjectId),
    });

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.ownerId).toBe(OWNER_ID);

    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('should allow admin to see all documents', async () => {
    const documents = [
      createDocumentMock(),
      createDocumentMock({
        _id: new Types.ObjectId(),
        ownerId: new Types.ObjectId(OTHER_OWNER_ID),
      }),
    ];

    mockDocument.find.mockReturnValue(
      createFindQueryMock(documents),
    );

    mockDocument.countDocuments.mockResolvedValue(2);

    const result = await getAllDocuments(
      OWNER_ID,
      'admin',
      {
        page: 1,
        limit: 10,
      },
    );

    expect(mockDocument.find).toHaveBeenCalledWith({
      isDeleted: false,
    });

    expect(mockDocument.countDocuments).toHaveBeenCalledWith({
      isDeleted: false,
    });

    expect(result.documents).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  it('should apply search filter', async () => {
    const documents = [
      createDocumentMock(),
    ];

    mockDocument.find.mockReturnValue(
      createFindQueryMock(documents),
    );

    mockDocument.countDocuments.mockResolvedValue(1);

    await getAllDocuments(
      OWNER_ID,
      'user',
      {
        page: 1,
        limit: 10,
        search: 'Test',
      },
    );

    expect(mockDocument.find).toHaveBeenCalledWith(
      expect.objectContaining({
        isDeleted: false,
        ownerId: expect.any(Types.ObjectId),
        $or: [
          {
            title: {
              $regex: 'Test',
              $options: 'i',
            },
          },
          {
            fileName: {
              $regex: 'Test',
              $options: 'i',
            },
          },
        ],
      }),
    );
  });
});

describe('getDocumentById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a document owned by the user', async () => {
    const document = createDocumentMock();

    mockDocument.findOne.mockResolvedValue(document);

    const result = await getDocumentById(
      OWNER_ID,
      'user',
      DOCUMENT_ID,
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: false,
    });

    expect(result).toMatchObject({
      id: DOCUMENT_ID,
      title: 'Test Document',
      ownerId: OWNER_ID,
    });
  });

  it('should allow admin to view any document', async () => {
    const document = createDocumentMock({
      ownerId: new Types.ObjectId(OTHER_OWNER_ID),
    });

    mockDocument.findOne.mockResolvedValue(document);

    const result = await getDocumentById(
      OWNER_ID,
      'admin',
      DOCUMENT_ID,
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: false,
    });

    expect(result.ownerId).toBe(OTHER_OWNER_ID);
  });

  it('should throw when document is not found', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
      getDocumentById(
        OWNER_ID,
        'user',
        DOCUMENT_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  });

  it('should throw when document id is invalid', async () => {
    await expect(
      getDocumentById(
        OWNER_ID,
        'user',
        'invalid-document-id',
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });

    expect(mockDocument.findOne).not.toHaveBeenCalled();
  });
});

describe('updateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocument.findOneAndUpdate.mockImplementation(() =>
      Promise.resolve(createDocumentMock({ version: 2 })),
    );
  });

  it('should update a document owned by the user', async () => {
    const document = createDocumentMock();

    mockDocument.findOne.mockResolvedValue(document);

    const result = await updateDocument(
      OWNER_ID,
      DOCUMENT_ID,
      {
        title: 'Updated title',
        description: 'Updated description',
      },
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: false,
    });

    expect(document.title).toBe('Updated title');
    expect(document.description).toBe(
      'Updated description',
    );

    expect(document.save).toHaveBeenCalled();

    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'UPDATE',
    );

    expect(result).toMatchObject({
      id: DOCUMENT_ID,
      title: 'Updated title',
      description: 'Updated description',
    });
  });

  it('should replace the document file', async () => {
    const document = createDocumentMock();

    mockDocument.findOne.mockResolvedValue(document);

    const result = await updateDocument(
      OWNER_ID,
      DOCUMENT_ID,
      {
        title: 'Updated title',
      },
      {
        originalname: 'new-document.pdf',
        path: 'uploads/documents/new-document.pdf',
        mimetype: 'application/pdf',
        size: 2048,
      },
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: false,
    });

    expect(document.title).toBe('Updated title');

    expect(document.fileName).toBe(
      'new-document.pdf',
    );

    expect(document.filePath).toContain(
      'new-document.pdf',
    );

    expect(document.fileType).toBe(
      'application/pdf',
    );

    expect(document.fileSize).toBe(2048);

    expect(document.save).toHaveBeenCalled();

    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'UPDATE',
    );

    expect(result).toMatchObject({
      id: DOCUMENT_ID,
      title: 'Updated title',
      fileName: 'new-document.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
    });
  });

  it('should replace the file without changing metadata', async () => {
    const document = createDocumentMock();

    mockDocument.findOne.mockResolvedValue(document);
    mockDocument.findOneAndUpdate.mockResolvedValue({ _id: document._id, version: 2 });

    const result = await updateDocument(
      OWNER_ID,
      DOCUMENT_ID,
      {},
      {
        originalname: 'replacement.txt',
        path: 'uploads/documents/replacement.txt',
        mimetype: 'text/plain',
        size: 512,
      },
    );

    expect(document.title).toBe(
      'Test Document',
    );

    expect(document.description).toBe(
      'Test description',
    );

    expect(document.fileName).toBe(
      'replacement.txt',
    );

    expect(document.filePath).toContain(
      'replacement.txt',
    );

    expect(document.fileType).toBe(
      'text/plain',
    );

    expect(document.fileSize).toBe(512);

    expect(document.save).toHaveBeenCalled();

    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'UPDATE',
    );

    expect(result).toMatchObject({
      fileName: 'replacement.txt',
      fileType: 'text/plain',
      fileSize: 512,
    });
  });

  it('should throw when user does not own the document', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
      updateDocument(
        OTHER_OWNER_ID,
        DOCUMENT_ID,
        {
          title: 'Updated title',
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  });
});

describe('deleteDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete a user document', async () => {
    const document = createDocumentMock();

    mockDocument.findOne.mockResolvedValue(document);

    const result = await deleteDocument(
      OWNER_ID,
      'user',
      DOCUMENT_ID,
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: false,
      ownerId: expect.any(Types.ObjectId),
    });

    expect(document.isDeleted).toBe(true);
    expect(document.save).toHaveBeenCalled();

    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'DELETE',
    );

    expect(result).toEqual({
      message: 'Document deleted successfully',
    });
  });

  it('should allow admin to soft delete any document', async () => {
    const document = createDocumentMock({
      ownerId: new Types.ObjectId(OTHER_OWNER_ID),
    });

    mockDocument.findOne.mockResolvedValue(document);

    const result = await deleteDocument(
      OWNER_ID,
      'admin',
      DOCUMENT_ID,
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: false,
    });

    expect(document.isDeleted).toBe(true);
    expect(document.save).toHaveBeenCalled();

    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'DELETE',
    );

    expect(result).toEqual({
      message: 'Document deleted successfully',
    });
  });

  it('should throw when deleting a missing document', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
      deleteDocument(
        OWNER_ID,
        'user',
        DOCUMENT_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  });
});

describe('restoreDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should restore a deleted document owned by the user', async () => {
    const document = createDocumentMock({
      isDeleted: true,
    });

    mockDocument.findOne.mockResolvedValue(document);

    const result = await restoreDocument(
      OWNER_ID,
      'user',
      DOCUMENT_ID,
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: true,
      ownerId: expect.any(Types.ObjectId),
    });

    expect(document.isDeleted).toBe(false);
    expect(document.save).toHaveBeenCalled();

    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'RESTORE',
    );

    expect(result).toEqual({
      message: 'Document restored successfully',
    });
  });

  it('should allow an admin to restore any deleted document', async () => {
    const document = createDocumentMock({
      ownerId: new Types.ObjectId(OTHER_OWNER_ID),
      isDeleted: true,
    });

    mockDocument.findOne.mockResolvedValue(document);

    const result = await restoreDocument(
      OWNER_ID,
      'admin',
      DOCUMENT_ID,
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: true,
    });

    expect(document.isDeleted).toBe(false);
    expect(document.save).toHaveBeenCalled();

    expect(mockCreateDocumentAudit).toHaveBeenCalledWith(
      DOCUMENT_ID,
      OWNER_ID,
      'RESTORE',
    );

    expect(result).toEqual({
      message: 'Document restored successfully',
    });
  });

  it('should not allow a user to restore another user document', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
      restoreDocument(
        OWNER_ID,
        'user',
        DOCUMENT_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: true,
      ownerId: expect.any(Types.ObjectId),
    });
  });

  it('should throw when restoring a missing document', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
      restoreDocument(
        OWNER_ID,
        'user',
        DOCUMENT_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  });

  it('should throw when document id is invalid', async () => {
    await expect(
      restoreDocument(
        OWNER_ID,
        'user',
        'invalid-document-id',
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });

    expect(mockDocument.findOne).not.toHaveBeenCalled();
  });
});

describe('downloadDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.access).mockResolvedValue(undefined);
  });

  it('should allow a user to download their own document', async () => {
    const document = createDocumentMock();

    mockDocument.findOne.mockResolvedValue(document);

    const result = await downloadDocument(
      OWNER_ID,
      'user',
      DOCUMENT_ID,
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: false,
    });

    expect(fs.access).toHaveBeenCalledWith(
      document.filePath,
    );

    expect(result).toEqual({
      filePath: expect.any(String),
      fileName: 'test.pdf',
      fileType: 'application/pdf',
    });
  });

  it('should allow an admin to download any document', async () => {
    const document = createDocumentMock({
      ownerId: new Types.ObjectId(OTHER_OWNER_ID),
    });

    mockDocument.findOne.mockResolvedValue(document);

    const result = await downloadDocument(
      OWNER_ID,
      'admin',
      DOCUMENT_ID,
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: false,
    });

    expect(result).toEqual({
      filePath: expect.any(String),
      fileName: 'test.pdf',
      fileType: 'application/pdf',
    });
  });

  it('should not allow a user to download another user document', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
      downloadDocument(
        OWNER_ID,
        'user',
        DOCUMENT_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });

    expect(fs.access).not.toHaveBeenCalled();
  });

  it('should not download a deleted document', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
      downloadDocument(
        OWNER_ID,
        'user',
        DOCUMENT_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  });

  it('should throw when the physical file does not exist', async () => {
    const document = createDocumentMock();

    mockDocument.findOne.mockResolvedValue(document);

    vi.mocked(fs.access).mockRejectedValue(
      new Error('ENOENT'),
    );

    await expect(
      downloadDocument(
        OWNER_ID,
        'user',
        DOCUMENT_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_FILE_NOT_FOUND',
    });
  });
});

describe('viewDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.access).mockResolvedValue(undefined);
  });

  it('should allow a user to view their own document', async () => {
    const document = createDocumentMock();

    mockDocument.findOne.mockResolvedValue(document);

    const result = await viewDocument(
      OWNER_ID,
      'user',
      DOCUMENT_ID,
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: false,
    });

    expect(fs.access).toHaveBeenCalledWith(
      document.filePath,
    );

    expect(result).toEqual({
      filePath: expect.any(String),
      fileName: 'test.pdf',
      fileType: 'application/pdf',
    });
  });

  it('should allow an admin to view any document', async () => {
    const document = createDocumentMock({
      ownerId: new Types.ObjectId(OTHER_OWNER_ID),
    });

    mockDocument.findOne.mockResolvedValue(document);

    const result = await viewDocument(
      OWNER_ID,
      'admin',
      DOCUMENT_ID,
    );

    expect(mockDocument.findOne).toHaveBeenCalledWith({
      _id: DOCUMENT_ID,
      isDeleted: false,
    });

    expect(result).toEqual({
      filePath: expect.any(String),
      fileName: 'test.pdf',
      fileType: 'application/pdf',
    });
  });

  it('should not allow a user to view another user document', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
      viewDocument(
        OWNER_ID,
        'user',
        DOCUMENT_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });

    expect(fs.access).not.toHaveBeenCalled();
  });

  it('should not view a deleted document', async () => {
    mockDocument.findOne.mockResolvedValue(null);

    await expect(
      viewDocument(
        OWNER_ID,
        'user',
        DOCUMENT_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_NOT_FOUND',
    });
  });

  it('should throw when the physical file does not exist', async () => {
    const document = createDocumentMock();

    mockDocument.findOne.mockResolvedValue(document);

    vi.mocked(fs.access).mockRejectedValue(
      new Error('ENOENT'),
    );

    await expect(
      viewDocument(
        OWNER_ID,
        'user',
        DOCUMENT_ID,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'DOCUMENT_FILE_NOT_FOUND',
    });
  });
});