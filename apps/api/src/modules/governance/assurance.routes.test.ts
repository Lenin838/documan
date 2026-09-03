import type { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAssuranceHandler,
  evaluateAssuranceHandler,
  grantWaiverHandler,
  revokeWaiverHandler,
} from './assurance.controller.js';
import * as assuranceService from './assurance.service.js';

vi.mock('./assurance.service.js');

describe('Assurance Controller & Route Handlers', () => {
  let req: Partial<Request> & { user?: { userId: string; role: 'user' | 'admin' } };
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      user: {
        userId: 'user1',
        role: 'user',
      },
      params: { id: 'doc1' },
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('getAssuranceHandler returns 200 with assurance data', async () => {
    vi.mocked(assuranceService.getForwardAssurance).mockResolvedValue({
      documentId: 'doc1',
      evaluatedAction: 'APPROVAL_RELEASE_READINESS',
      status: 'READY',
      evaluatedAt: new Date(),
      summary: { totalChecks: 11, passedCount: 11, warningCount: 0, failedCount: 0, waivedCount: 0 },
      checks: [],
      blockingReasons: [],
      warnings: [],
      remediations: [],
      activeWaivers: [],
    });

    await getAssuranceHandler(req as Request, res as Response, next);

    expect(assuranceService.getForwardAssurance).toHaveBeenCalledWith('user1', 'user', 'doc1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ status: 'READY' }),
      }),
    );
  });

  it('evaluateAssuranceHandler calls evaluateFormalAssurance', async () => {
    vi.mocked(assuranceService.evaluateFormalAssurance).mockResolvedValue({
      documentId: 'doc1',
      evaluatedAction: 'APPROVAL_RELEASE_READINESS',
      status: 'READY',
      evaluatedAt: new Date(),
      summary: { totalChecks: 11, passedCount: 11, warningCount: 0, failedCount: 0, waivedCount: 0 },
      checks: [],
      blockingReasons: [],
      warnings: [],
      remediations: [],
      activeWaivers: [],
    });

    await evaluateAssuranceHandler(req as Request, res as Response, next);

    expect(assuranceService.evaluateFormalAssurance).toHaveBeenCalledWith('user1', 'user', 'doc1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('grantWaiverHandler passes checkId and reason to grantGovernanceWaiver', async () => {
    req.body = { checkId: 'chk_evidence_coverage', reason: 'Temporary exception' };
    vi.mocked(assuranceService.grantGovernanceWaiver).mockResolvedValue({
      documentId: 'doc1',
      evaluatedAction: 'APPROVAL_RELEASE_READINESS',
      status: 'READY',
      evaluatedAt: new Date(),
      summary: { totalChecks: 11, passedCount: 11, warningCount: 0, failedCount: 0, waivedCount: 0 },
      checks: [],
      blockingReasons: [],
      warnings: [],
      remediations: [],
      activeWaivers: [],
    });

    await grantWaiverHandler(req as Request, res as Response, next);

    expect(assuranceService.grantGovernanceWaiver).toHaveBeenCalledWith('user1', 'user', 'doc1', {
      checkId: 'chk_evidence_coverage',
      reason: 'Temporary exception',
      expiresInDays: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('revokeWaiverHandler passes checkId to revokeGovernanceWaiver', async () => {
    req.params = { id: 'doc1', checkId: 'chk_evidence_coverage' };
    vi.mocked(assuranceService.revokeGovernanceWaiver).mockResolvedValue({
      documentId: 'doc1',
      evaluatedAction: 'APPROVAL_RELEASE_READINESS',
      status: 'READY',
      evaluatedAt: new Date(),
      summary: { totalChecks: 11, passedCount: 11, warningCount: 0, failedCount: 0, waivedCount: 0 },
      checks: [],
      blockingReasons: [],
      warnings: [],
      remediations: [],
      activeWaivers: [],
    });

    await revokeWaiverHandler(req as Request, res as Response, next);

    expect(assuranceService.revokeGovernanceWaiver).toHaveBeenCalledWith('user1', 'user', 'doc1', 'chk_evidence_coverage');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
