import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDocumentRelationshipController,
  getDocumentRelationshipsController,
  deleteDocumentRelationshipController,
} from './document-relationship.controller.js';
import * as relationshipService from './document-relationship.service.js';
import { AppError } from '../../errors/app-error.js';

vi.mock('./document-relationship.service.js');

describe('Document Relationship Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const DOC_ID = '507f1f77bcf86cd799439033';
  const REL_ID = '507f1f77bcf86cd799439055';

  beforeEach(() => {
    req = {
      user: {
        userId: '507f1f77bcf86cd799439011',
        role: 'user',
      },
      params: {
        id: DOC_ID,
        relationshipId: REL_ID,
      },
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {
        validatedParams: { id: DOC_ID, relationshipId: REL_ID },
      },
    };

    next = vi.fn() as unknown as NextFunction;
    vi.clearAllMocks();
  });

  describe('createDocumentRelationshipController', () => {
    it('creates a relationship successfully returning 201', async () => {
      const mockResult = {
        id: REL_ID,
        sourceDocumentId: DOC_ID,
        targetDocumentId: '507f1f77bcf86cd799439044',
        type: 'REFERENCES' as const,
        direction: 'OUTGOING' as const,
        sourceDocument: { id: DOC_ID, title: 'A', fileName: 'a.pdf', fileType: 'pdf' },
        targetDocument: { id: '507f1f77bcf86cd799439044', title: 'B', fileName: 'b.pdf', fileType: 'pdf' },
        relatedDocument: { id: '507f1f77bcf86cd799439044', title: 'B', fileName: 'b.pdf', fileType: 'pdf' },
        createdBy: '507f1f77bcf86cd799439011',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(relationshipService, 'createDocumentRelationship').mockResolvedValue(
        mockResult,
      );

      await createDocumentRelationshipController(
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

      await createDocumentRelationshipController(
        req as Request,
        res as Response,
        next,
      );

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getDocumentRelationshipsController', () => {
    it('returns relationship list successfully with 200', async () => {
      vi.spyOn(relationshipService, 'getDocumentRelationships').mockResolvedValue([]);

      await getDocumentRelationshipsController(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { relationships: [] },
      });
    });
  });

  describe('deleteDocumentRelationshipController', () => {
    it('deletes relationship successfully returning 200', async () => {
      vi.spyOn(relationshipService, 'deleteDocumentRelationship').mockResolvedValue({
        message: 'Relationship deleted successfully',
      });

      await deleteDocumentRelationshipController(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Relationship deleted successfully' },
      });
    });
  });
});
