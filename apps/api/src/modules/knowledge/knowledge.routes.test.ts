import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchKnowledgeController } from './knowledge.controller.js';
import * as knowledgeService from './knowledge.service.js';

vi.mock('./knowledge.service.js');

describe('Knowledge Search Controller & Route Handler', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: {
        userId: '507f1f77bcf86cd799439011',
        role: 'user',
      },
      query: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    next = vi.fn() as unknown as NextFunction;
    vi.clearAllMocks();
  });

  it('rejects unauthenticated request with 401', async () => {
    delete req.user;
    await searchKnowledgeController(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      }),
    );
  });

  it('executes search successfully and returns 200 payload', async () => {
    const mockResponse: knowledgeService.KnowledgeSearchResponse = {
      query: 'oauth',
      results: [
        {
          documentId: '507f1f77bcf86cd799439022',
          title: 'OAuth Specification',
          description: 'OAuth 2.0 Auth Spec',
          fileName: 'oauth_spec.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          status: 'APPROVED',
          version: 2,
          lastApprovedVersion: 2,
          isApprovedVersion: true,
          projectId: '507f1f77bcf86cd799439033',
          projectName: 'Auth Service',
          owner: { id: '507f1f77bcf86cd799439011', name: 'Alice' },
          steward: { id: '507f1f77bcf86cd799439011', name: 'Alice', isExplicitSteward: true },
          lastReviewedAt: new Date('2026-08-01'),
          ranking: { score: 95, relevanceReasons: ['Exact Title Match'] },
          health: { riskScore: 0, riskLevel: 'LOW' },
          traceability: { relatedDocuments: [], linkedApiEndpoints: [] },
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    vi.mocked(knowledgeService.searchTechnicalKnowledge).mockResolvedValue(mockResponse);

    req.query = { q: 'oauth', limit: '20' };

    await searchKnowledgeController(req as Request, res as Response, next);

    expect(knowledgeService.searchTechnicalKnowledge).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'user',
      expect.objectContaining({ q: 'oauth', limit: 20 }),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockResponse,
    });
  });

  it('handles invalid limit with 400 error', async () => {
    req.query = { limit: '999' };

    await searchKnowledgeController(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'INVALID_QUERY_PARAMS',
      }),
    );
  });
});
