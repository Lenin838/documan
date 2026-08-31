import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDocumentShareController,
  getDocumentSharesController,
} from './document-share.controller.js';
import * as documentShareService from './document-share.service.js';
import { AppError } from '../../errors/app-error.js';

vi.mock('./document-share.service.js');

describe('Document Share Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: {
        userId: '507f1f77bcf86cd799439011',
        role: 'user',
      },
      params: {
        id: '507f1f77bcf86cd799439033',
        shareId: '507f1f77bcf86cd799439044',
      },
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn() as unknown as NextFunction;
    vi.clearAllMocks();
  });

  describe('createDocumentShareController', () => {
    it('creates a document share successfully', async () => {
      const mockResult = {
        id: '507f1f77bcf86cd799439044',
        documentId: '507f1f77bcf86cd799439033',
        sharedWithUser: {
          id: '507f1f77bcf86cd799439022',
          name: 'Target User',
          email: 'target@example.com',
        },
        permission: 'READ' as const,
        createdBy: '507f1f77bcf86cd799439011',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(documentShareService, 'createDocumentShare').mockResolvedValue(
        mockResult,
      );

      await createDocumentShareController(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('passes error to next when unauthenticated', async () => {
      delete req.user;

      await createDocumentShareController(
        req as Request,
        res as Response,
        next,
      );

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getDocumentSharesController', () => {
    it('returns shares list successfully', async () => {
      vi.spyOn(documentShareService, 'getDocumentShares').mockResolvedValue(
        [],
      );

      await getDocumentSharesController(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { shares: [] },
      });
    });
  });
});
