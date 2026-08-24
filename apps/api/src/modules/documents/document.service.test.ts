import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
} from './document.service.js';

import { Document } from './document.model.js';

vi.mock('./document.model.js', () => ({
  Document: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

const mockDocument = Document as unknown as {
  create: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
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
        fileName: 'test.pdf',
        filePath: '/uploads/test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      },
    );

    expect(mockDocument.create).toHaveBeenCalledWith({
      title: 'Test Document',
      description: 'Test description',
      fileName: 'test.pdf',
      filePath: '/uploads/test.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: expect.any(Types.ObjectId),
      isDeleted: false,
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
        fileName: 'test.pdf',
        filePath: '/uploads/test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      },
    );

    expect(mockDocument.create).toHaveBeenCalledWith({
      title: 'Test Document',
      fileName: 'test.pdf',
      filePath: '/uploads/test.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      ownerId: expect.any(Types.ObjectId),
      isDeleted: false,
    });

    expect(result.id).toBe(DOCUMENT_ID);
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
      ownerId: expect.any(Types.ObjectId),
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
});

describe('updateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      ownerId: expect.any(Types.ObjectId),
      isDeleted: false,
    });

    expect(document.title).toBe('Updated title');
    expect(document.description).toBe(
      'Updated description',
    );

    expect(document.save).toHaveBeenCalled();

    expect(result).toMatchObject({
      id: DOCUMENT_ID,
      title: 'Updated title',
      description: 'Updated description',
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