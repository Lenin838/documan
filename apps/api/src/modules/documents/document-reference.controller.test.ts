import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import {
  createDocumentReferenceController,
  getDocumentReferencesController,
  updateDocumentReferenceController,
  deleteDocumentReferenceController,
} from './document-reference.controller.js';
import * as referenceService from './document-reference.service.js';
import type { DocumentReferenceResponse } from './document-reference.service.js';

vi.mock('./document-reference.service.js', () => ({
  createDocumentReference: vi.fn(),
  getDocumentReferences: vi.fn(),
  updateDocumentReference: vi.fn(),
  deleteDocumentReference: vi.fn(),
}));

describe('document-reference.controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      user: {
        userId: '507f1f77bcf86cd799439011',
        role: 'user',
      },
    };

    mockResponse = {
      locals: {
        validatedParams: {
          id: '507f1f77bcf86cd799439055',
          referenceId: '507f1f77bcf86cd799439066',
        },
        validatedBody: {
          type: 'API',
          title: 'OpenAPI Docs',
          url: 'https://api.example.com',
        },
      },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    nextFunction = vi.fn() as unknown as NextFunction;
  });

  describe('createDocumentReferenceController', () => {
    it('creates reference and returns 201', async () => {
      const mockResult: DocumentReferenceResponse = {
        id: '507f1f77bcf86cd799439066',
        documentId: '507f1f77bcf86cd799439055',
        type: 'API',
        title: 'OpenAPI Docs',
        url: 'https://api.example.com',
        createdBy: '507f1f77bcf86cd799439011',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(referenceService.createDocumentReference).mockResolvedValue(
        mockResult,
      );

      await createDocumentReferenceController(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult,
        }),
      );
    });

    it('passes authentication error to next if user missing', async () => {
      delete mockRequest.user;

      await createDocumentReferenceController(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );
    });
  });

  describe('getDocumentReferencesController', () => {
    it('returns references list with 200 OK', async () => {
      const mockResult: DocumentReferenceResponse[] = [
        {
          id: '507f1f77bcf86cd799439066',
          documentId: '507f1f77bcf86cd799439055',
          type: 'API',
          title: 'API Docs',
          url: 'https://api.example.com',
          createdBy: '507f1f77bcf86cd799439011',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(referenceService.getDocumentReferences).mockResolvedValue(
        mockResult,
      );

      await getDocumentReferencesController(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            references: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('updateDocumentReferenceController', () => {
    it('updates reference and returns 200 OK', async () => {
      const mockResult: DocumentReferenceResponse = {
        id: '507f1f77bcf86cd799439066',
        documentId: '507f1f77bcf86cd799439055',
        type: 'API',
        title: 'Updated Title',
        url: 'https://api.example.com',
        createdBy: '507f1f77bcf86cd799439011',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(referenceService.updateDocumentReference).mockResolvedValue(
        mockResult,
      );

      await updateDocumentReferenceController(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteDocumentReferenceController', () => {
    it('deletes reference and returns 200 OK', async () => {
      vi.mocked(referenceService.deleteDocumentReference).mockResolvedValue({
        message: 'Technical reference removed successfully',
      });

      await deleteDocumentReferenceController(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
