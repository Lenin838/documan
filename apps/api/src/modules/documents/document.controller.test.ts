import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateDocument,
  mockGetAllDocuments,
  mockGetDocumentById,
  mockUpdateDocument,
  mockDeleteDocument,
  mockRestoreDocument,
  mockDownloadDocument,
  mockViewDocument,
  mockGetDocumentAuditHistory,
} = vi.hoisted(() => {
  process.env.MONGO_URI =
    'mongodb://127.0.0.1:27017/documan_test';

  process.env.JWT_SECRET =
    'test-secret-that-is-at-least-32-characters-long';

  return {
    mockCreateDocument: vi.fn(),
    mockGetAllDocuments: vi.fn(),
    mockGetDocumentById: vi.fn(),
    mockUpdateDocument: vi.fn(),
    mockDeleteDocument: vi.fn(),
    mockRestoreDocument: vi.fn(),
    mockDownloadDocument: vi.fn(),
    mockViewDocument: vi.fn(),
    mockGetDocumentAuditHistory: vi.fn(),
  };
});

vi.mock('./document.service.js', () => ({
  createDocument: mockCreateDocument,
  getAllDocuments: mockGetAllDocuments,
  getDocumentById: mockGetDocumentById,
  updateDocument: mockUpdateDocument,
  deleteDocument: mockDeleteDocument,
  restoreDocument: mockRestoreDocument,
  downloadDocument: mockDownloadDocument,
  viewDocument: mockViewDocument,
}));

vi.mock('./document-audit.service.js', () => ({
  getDocumentAuditHistory: mockGetDocumentAuditHistory,
}));

import {
  createDocumentController,
  getAllDocumentsController,
  getDocumentByIdController,
  updateDocumentController,
  deleteDocumentController,
  restoreDocumentController,
  downloadDocumentController,
  viewDocumentController,
  getDocumentAuditHistoryController,
} from './document.controller.js';

function createMockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
    sendFile: vi.fn(),
    locals: {},
  } as unknown as Response;

  vi.mocked(res.status).mockReturnValue(res);
  vi.mocked(res.json).mockReturnValue(res);

  return res;
}

function createMockNext() {
  return vi.fn() as unknown as NextFunction;
}

function createMockRequest(
  overrides: Partial<Request> = {},
): Request {
  return {
    ...overrides,
  } as Request;
}

const mockDocument = {
  id: 'document-123',
  title: 'Test Document',
  description: 'Test description',
  fileName: 'test.pdf',
  filePath: 'uploads/documents/test.pdf',
  fileType: 'application/pdf',
  fileSize: 1024,
  ownerId: 'user-123',
  isDeleted: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('document controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDocumentController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest({
        body: {
          title: 'Test Document',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      await createDocumentController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(
        mockCreateDocument,
      ).not.toHaveBeenCalled();
    });

    it('should reject when file is missing', async () => {
      const req = createMockRequest({
        body: {
          title: 'Test Document',
        },
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      await createDocumentController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'DOCUMENT_FILE_REQUIRED',
        }),
      );

      expect(
        mockCreateDocument,
      ).not.toHaveBeenCalled();
    });

    it('should create a document successfully', async () => {
      const body = {
        title: 'Test Document',
        description: 'Test description',
      };

      const file = {
        originalname: 'test.pdf',
        path: 'uploads/documents/test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const req = createMockRequest({
        body,
        file: file as Request['file'],
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      mockCreateDocument.mockResolvedValue(
        mockDocument,
      );

      await createDocumentController(
        req,
        res,
        next,
      );

      expect(
        mockCreateDocument,
      ).toHaveBeenCalledWith(
        'user-123',
        body,
        {
          originalname: 'test.pdf',
          path: 'uploads/documents/test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        },
      );

      expect(res.status).toHaveBeenCalledWith(201);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDocument,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        body: {
          title: 'Test Document',
        },
        file: {
          originalname: 'test.pdf',
          path: 'uploads/documents/test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        } as Request['file'],
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      const error = new Error(
        'Document creation failed',
      );

      mockCreateDocument.mockRejectedValue(error);

      await createDocumentController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllDocumentsController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await getAllDocumentsController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(
        mockGetAllDocuments,
      ).not.toHaveBeenCalled();
    });

    it('should return documents successfully', async () => {
      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();

      const validatedQuery = {
        page: 1,
        limit: 10,
        search: 'test',
      };

      res.locals = {
        validatedQuery,
      };

      const next = createMockNext();

      const result = {
        documents: [mockDocument],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockGetAllDocuments.mockResolvedValue(result);

      await getAllDocumentsController(
        req,
        res,
        next,
      );

      expect(
        mockGetAllDocuments,
      ).toHaveBeenCalledWith(
        'user-123',
        'user',
        validatedQuery,
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: result,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedQuery: {
          page: 1,
          limit: 10,
        },
      };

      const next = createMockNext();

      const error = new Error(
        'Failed to get documents',
      );

      mockGetAllDocuments.mockRejectedValue(error);

      await getAllDocumentsController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getDocumentByIdController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      await getDocumentByIdController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(
        mockGetDocumentById,
      ).not.toHaveBeenCalled();
    });

    it('should return a document successfully', async () => {
      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      mockGetDocumentById.mockResolvedValue(
        mockDocument,
      );

      await getDocumentByIdController(
        req,
        res,
        next,
      );

      expect(
        mockGetDocumentById,
      ).toHaveBeenCalledWith(
        'user-123',
        'user',
        'document-123',
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockDocument,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      const error = new Error(
        'Document not found',
      );

      mockGetDocumentById.mockRejectedValue(error);

      await getDocumentByIdController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateDocumentController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest({
        body: {
          title: 'Updated Document',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      await updateDocumentController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(
        mockUpdateDocument,
      ).not.toHaveBeenCalled();
    });

    it('should update a document successfully', async () => {
      const body = {
        title: 'Updated Document',
        description: 'Updated description',
      };

      const req = createMockRequest({
        body,
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      const updatedDocument = {
        ...mockDocument,
        title: 'Updated Document',
      };

      mockUpdateDocument.mockResolvedValue(
        updatedDocument,
      );

      await updateDocumentController(
        req,
        res,
        next,
      );

      expect(
        mockUpdateDocument,
        ).toHaveBeenCalledWith(
        'user-123',
        'document-123',
        body,
        undefined,
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedDocument,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should replace the document file successfully', async () => {
        const body = {
            title: 'Updated Document',
        };

        const file = {
            originalname: 'new-document.pdf',
            path: 'uploads/documents/new-document.pdf',
            mimetype: 'application/pdf',
            size: 2048,
        };

        const req = createMockRequest({
            body,
            file: file as Request['file'],
            user: {
            userId: 'user-123',
            role: 'user',
            },
        });

        const res = createMockResponse();

        res.locals = {
            validatedParams: {
            id: 'document-123',
            },
        };

        const next = createMockNext();

        const updatedDocument = {
            ...mockDocument,
            title: 'Updated Document',
            fileName: 'new-document.pdf',
            filePath: 'uploads/documents/new-document.pdf',
            fileType: 'application/pdf',
            fileSize: 2048,
        };

        mockUpdateDocument.mockResolvedValue(
            updatedDocument,
        );

        await updateDocumentController(
            req,
            res,
            next,
        );

        expect(
            mockUpdateDocument,
        ).toHaveBeenCalledWith(
            'user-123',
            'document-123',
            body,
            {
            originalname: 'new-document.pdf',
            path: 'uploads/documents/new-document.pdf',
            mimetype: 'application/pdf',
            size: 2048,
            },
        );

        expect(res.status).toHaveBeenCalledWith(200);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data: updatedDocument,
        });

        expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        body: {
          title: 'Updated Document',
        },
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      const error = new Error(
        'Update failed',
      );

      mockUpdateDocument.mockRejectedValue(error);

      await updateDocumentController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteDocumentController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      await deleteDocumentController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(
        mockDeleteDocument,
      ).not.toHaveBeenCalled();
    });

    it('should delete a document successfully', async () => {
      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      const result = {
        message: 'Document deleted successfully',
      };

      mockDeleteDocument.mockResolvedValue(result);

      await deleteDocumentController(
        req,
        res,
        next,
      );

      expect(
        mockDeleteDocument,
      ).toHaveBeenCalledWith(
        'user-123',
        'user',
        'document-123',
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: result,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      const error = new Error(
        'Delete failed',
      );

      mockDeleteDocument.mockRejectedValue(error);

      await deleteDocumentController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('restoreDocumentController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject when authentication is missing', async () => {
    const req = createMockRequest();

    const res = createMockResponse();
    res.locals.validatedParams = {
        id: 'document-123',
    };

    const next = createMockNext();

    await restoreDocumentController(
        req,
        res,
        next,
    );

    expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        }),
    );

    expect(mockRestoreDocument).not.toHaveBeenCalled();
  });

  it('should restore a document successfully', async () => {
    const req = createMockRequest({
      user: {
        userId: 'user-123',
        role: 'user',
      },
    });

    const res = createMockResponse();
    res.locals.validatedParams = {
      id: 'document-123',
    };

    const next = createMockNext();

    mockRestoreDocument.mockResolvedValue({
      message: 'Document restored successfully',
    });

    await restoreDocumentController(
      req,
      res,
      next,
    );

    expect(mockRestoreDocument).toHaveBeenCalledWith(
      'user-123',
      'user',
      'document-123',
    );
  });

  it('should pass service errors to next', async () => {
    const req = createMockRequest({
      user: {
        userId: 'user-123',
        role: 'user',
      },
    });

    const res = createMockResponse();
    res.locals.validatedParams = {
      id: 'document-123',
    };

    const next = createMockNext();
    const error = new Error('Restore failed');

    mockRestoreDocument.mockRejectedValue(error);

    await restoreDocumentController(
      req,
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('getDocumentAuditHistoryController', () => {
  it('should reject when authentication is missing', async () => {
    const req = createMockRequest();

    const res = createMockResponse();

    res.locals = {
      validatedParams: {
        id: 'document-123',
      },
    };

    const next = createMockNext();

    await getDocumentAuditHistoryController(
      req,
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
      }),
    );

    expect(
      mockGetDocumentAuditHistory,
    ).not.toHaveBeenCalled();
  });

  it('should return audit history successfully', async () => {
    const req = createMockRequest({
      user: {
        userId: 'user-123',
        role: 'user',
      },
    });

    const res = createMockResponse();

    res.locals = {
      validatedParams: {
        id: 'document-123',
      },
    };

    const next = createMockNext();

    const history = [
      {
        action: 'CREATE',
        userId: 'user-123',
      },
      {
        action: 'UPDATE',
        userId: 'user-123',
      },
    ];

    mockGetDocumentAuditHistory.mockResolvedValue(
      history,
    );

    await getDocumentAuditHistoryController(
      req,
      res,
      next,
    );

    expect(
      mockGetDocumentAuditHistory,
    ).toHaveBeenCalledWith(
      'user-123',
      'user',
      'document-123',
    );

    expect(res.status).toHaveBeenCalledWith(200);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: history,
    });

    expect(next).not.toHaveBeenCalled();
  });

  it('should pass service errors to next', async () => {
    const req = createMockRequest({
      user: {
        userId: 'user-123',
        role: 'user',
      },
    });

    const res = createMockResponse();

    res.locals = {
      validatedParams: {
        id: 'document-123',
      },
    };

    const next = createMockNext();

    const error = new Error(
      'Audit history failed',
    );

    mockGetDocumentAuditHistory.mockRejectedValue(
      error,
    );

    await getDocumentAuditHistoryController(
      req,
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});

  describe('downloadDocumentController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest();

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      await downloadDocumentController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(
        mockDownloadDocument,
      ).not.toHaveBeenCalled();
    });

    it('should download a document successfully', async () => {
      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      mockDownloadDocument.mockResolvedValue({
        filePath: 'uploads/documents/test.pdf',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
      });

      await downloadDocumentController(
        req,
        res,
        next,
      );

      expect(
        mockDownloadDocument,
      ).toHaveBeenCalledWith(
        'user-123',
        'user',
        'document-123',
      );

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="test.pdf"',
        );

        expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
        );

        expect(res.sendFile).toHaveBeenCalledWith(
        'uploads/documents/test.pdf',
        );

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'document-123',
        },
      };

      const next = createMockNext();

      const error = new Error(
        'Document not found',
      );

      mockDownloadDocument.mockRejectedValue(error);

      await downloadDocumentController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('viewDocumentController', () => {
    it('should reject when authentication is missing', async () => {
        const req = createMockRequest();

        const res = createMockResponse();

        res.locals = {
        validatedParams: {
            id: 'document-123',
        },
        };

        const next = createMockNext();

        await viewDocumentController(
        req,
        res,
        next,
        );

        expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
            statusCode: 401,
            code: 'AUTHENTICATION_REQUIRED',
        }),
        );

        expect(
        mockViewDocument,
        ).not.toHaveBeenCalled();
    });

    it('should view a document successfully', async () => {
        const req = createMockRequest({
        user: {
            userId: 'user-123',
            role: 'user',
        },
        });

        const res = createMockResponse();

        res.locals = {
        validatedParams: {
            id: 'document-123',
        },
        };

        const next = createMockNext();

        mockViewDocument.mockResolvedValue({
        filePath: 'uploads/documents/test.pdf',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        });

        await viewDocumentController(
        req,
        res,
        next,
        );

        expect(
        mockViewDocument,
        ).toHaveBeenCalledWith(
        'user-123',
        'user',
        'document-123',
        );

        expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'inline; filename="test.pdf"',
        );

        expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
        );

        expect(res.sendFile).toHaveBeenCalledWith(
        'uploads/documents/test.pdf',
        );

        expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
        const req = createMockRequest({
        user: {
            userId: 'user-123',
            role: 'user',
        },
        });

        const res = createMockResponse();

        res.locals = {
        validatedParams: {
            id: 'document-123',
        },
        };

        const next = createMockNext();

        const error = new Error(
        'Document not found',
        );

        mockViewDocument.mockRejectedValue(error);

        await viewDocumentController(
        req,
        res,
        next,
        );

        expect(next).toHaveBeenCalledWith(error);
    });
  });
});