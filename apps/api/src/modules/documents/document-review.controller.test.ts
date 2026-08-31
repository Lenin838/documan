import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import {
  createDocumentReviewController,
  getDocumentReviewsController,
  approveDocumentReviewController,
  requestChangesDocumentReviewController,
  getPendingReviewsController,
} from './document-review.controller.js';
import * as reviewService from './document-review.service.js';
import type { DocumentReviewResponse } from './document-review.service.js';

vi.mock('./document-review.service.js', () => ({
  createDocumentReview: vi.fn(),
  getDocumentReviews: vi.fn(),
  approveDocumentReview: vi.fn(),
  requestChangesDocumentReview: vi.fn(),
  getPendingReviews: vi.fn(),
}));

describe('document-review.controller', () => {
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
          id: '507f1f77bcf86cd799439066',
          reviewId: '507f1f77bcf86cd799439077',
        },
        validatedBody: {
          reviewerId: '507f1f77bcf86cd799439022',
          comment: 'Please review',
        },
      },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    nextFunction = vi.fn() as unknown as NextFunction;
  });

  describe('createDocumentReviewController', () => {
    it('creates review and returns 201', async () => {
      const mockResult: DocumentReviewResponse = {
        id: '507f1f77bcf86cd799439077',
        documentId: '507f1f77bcf86cd799439066',
        requesterId: '507f1f77bcf86cd799439011',
        reviewerId: '507f1f77bcf86cd799439022',
        status: 'PENDING',
        comment: 'Please review',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(reviewService.createDocumentReview).mockResolvedValue(
        mockResult,
      );

      await createDocumentReviewController(
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
  });

  describe('getDocumentReviewsController', () => {
    it('returns reviews list with 200 OK', async () => {
      vi.mocked(reviewService.getDocumentReviews).mockResolvedValue([]);

      await getDocumentReviewsController(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('approveDocumentReviewController', () => {
    it('approves review and returns 200 OK', async () => {
      vi.mocked(reviewService.approveDocumentReview).mockResolvedValue({
        id: '507f1f77bcf86cd799439077',
        status: 'APPROVED',
      } as never);

      await approveDocumentReviewController(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('requestChangesDocumentReviewController', () => {
    it('requests changes and returns 200 OK', async () => {
      vi.mocked(reviewService.requestChangesDocumentReview).mockResolvedValue({
        id: '507f1f77bcf86cd799439077',
        status: 'CHANGES_REQUESTED',
      } as never);

      await requestChangesDocumentReviewController(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getPendingReviewsController', () => {
    it('returns pending reviews queue with 200 OK', async () => {
      vi.mocked(reviewService.getPendingReviews).mockResolvedValue([]);

      await getPendingReviewsController(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
