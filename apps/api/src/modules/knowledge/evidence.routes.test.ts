import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getForwardEvidenceController,
  getReverseDocumentController,
  getReverseEndpointController,
  getReverseReferenceController,
} from './evidence.controller.js';
import * as evidenceService from './evidence.service.js';
import type { EvidenceCoverageResult } from './evidence.types.js';

vi.mock('./evidence.service.js');

describe('Evidence Controller & Route Suite', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: {
        userId: '507f1f77bcf86cd799439011',
        role: 'user',
      },
      params: {},
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
    await getForwardEvidenceController(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'UNAUTHORIZED',
      }),
    );
  });

  it('handles getForwardEvidenceController successfully', async () => {
    const mockResult: EvidenceCoverageResult = {
      documentId: '507f1f77bcf86cd799439011',
      coverageScore: 100,
      label: 'EXCELLENT',
      applicableCount: 2,
      verifiedCount: 2,
      staleCount: 0,
      orphanedCount: 0,
      unverifiedCount: 0,
      items: [],
      remediations: [],
    };

    vi.mocked(evidenceService.getForwardEvidence).mockResolvedValue(mockResult);

    req.params = { id: '507f1f77bcf86cd799439011' };

    await getForwardEvidenceController(req as Request, res as Response, next);

    expect(evidenceService.getForwardEvidence).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'user',
      '507f1f77bcf86cd799439011',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockResult,
    });
  });

  it('handles getReverseEndpointController successfully', async () => {
    const mockResult: evidenceService.ReverseEndpointResponse = {
      endpointId: '507f1f77bcf86cd799439022',
      method: 'POST',
      path: '/api/v1/auth/token',
      citingDocuments: [],
    };

    vi.mocked(evidenceService.getReverseEndpoint).mockResolvedValue(mockResult);

    req.query = { endpointId: '507f1f77bcf86cd799439022' };

    await getReverseEndpointController(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('handles getReverseDocumentController successfully', async () => {
    const mockResult: evidenceService.ReverseDocumentResponse = {
      targetDocumentId: '507f1f77bcf86cd799439033',
      targetTitle: 'Target Spec',
      citingDocuments: [],
    };

    vi.mocked(evidenceService.getReverseDocument).mockResolvedValue(mockResult);

    req.query = { targetDocumentId: '507f1f77bcf86cd799439033' };

    await getReverseDocumentController(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('handles getReverseReferenceController successfully', async () => {
    const mockResult: evidenceService.ReverseReferenceResponse = {
      url: 'https://docs.test/adr-001',
      citingDocuments: [],
    };

    vi.mocked(evidenceService.getReverseReference).mockResolvedValue(mockResult);

    req.query = { url: 'https://docs.test/adr-001' };

    await getReverseReferenceController(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
