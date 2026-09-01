/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import supertest from 'supertest';
import crypto from 'crypto';

process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/documan_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_32_bytes_long';

import { Project } from '../projects/project.model.js';
import * as releaseGateEvaluator from './release-gate-evaluator.service.js';
import * as auditService from '../documents/document-audit.service.js';

vi.mock('../documents/document-audit.service.js', () => ({
  createDocumentAudit: vi.fn().mockResolvedValue(true),
}));

let app: express.Application;

describe('Gate Check API & Security Suite', () => {
  const userId = new Types.ObjectId().toString();
  const projectIdA = new Types.ObjectId().toString();
  const projectIdB = new Types.ObjectId().toString();

  const rawToken = 'documan_gate_1234567890abcdef1234567890abcdef';
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  beforeAll(async () => {
    const authMiddleware = await import('../../middleware/auth.middleware.js');
    vi.spyOn(authMiddleware, 'authenticate').mockImplementation((req: Request, _res: Response, next: NextFunction) => {
      Object.assign(req, { user: { userId, role: 'user' } });
      next();
      return Promise.resolve();
    });

    const { apiRouter } = await import('../../routes/index.js');
    const { errorMiddleware } = await import('../../middleware/error.middleware.js');

    app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);
    app.use(errorMiddleware);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/projects/:projectId/governance/gate-check', () => {
    it('should return HTTP 200 OK when gate evaluation passes', async () => {
      const mockProject = {
        _id: new Types.ObjectId(projectIdA),
        isArchived: false,
        gateTokens: [
          {
            _id: new Types.ObjectId(),
            name: 'CI Token',
            tokenHash,
            tokenPrefix: 'documan_gate_1234',
            revokedAt: null,
            expiresAt: null,
            save: vi.fn(),
          },
        ],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Project, 'findOne').mockImplementation(((query: any) => {
        if (query._id === projectIdA) {
          return Promise.resolve(mockProject as any);
        }
        return Promise.resolve(null as any);
      }) as any);

      vi.spyOn(releaseGateEvaluator, 'evaluateReleaseGateInternal').mockResolvedValue({
        passed: true,
        status: 'PASSED',
        projectId: projectIdA,
        freshnessPercentage: 100,
        evaluatedAt: new Date(),
        summary: { totalTracked: 5, approvedFresh: 5, staleCount: 0, pendingReviewCount: 0, deprecatedCount: 0 },
        blockingDocuments: [],
      });

      const res = await supertest(app)
        .post(`/api/v1/projects/${projectIdA}/governance/gate-check`)
        .set('Authorization', `Bearer ${rawToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.passed).toBe(true);
      expect(auditService.createDocumentAudit).not.toHaveBeenCalled();
    });

    it('should return HTTP 412 Precondition Failed when gate evaluation is BLOCKED', async () => {
      const mockProject = {
        _id: new Types.ObjectId(projectIdA),
        isArchived: false,
        gateTokens: [
          {
            _id: new Types.ObjectId(),
            name: 'CI Token',
            tokenHash,
            tokenPrefix: 'documan_gate_1234',
            revokedAt: null,
            expiresAt: null,
          },
        ],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);

      vi.spyOn(releaseGateEvaluator, 'evaluateReleaseGateInternal').mockResolvedValue({
        passed: false,
        status: 'BLOCKED',
        projectId: projectIdA,
        freshnessPercentage: 50,
        evaluatedAt: new Date(),
        summary: { totalTracked: 4, approvedFresh: 2, staleCount: 2, pendingReviewCount: 0, deprecatedCount: 0 },
        blockingDocuments: [
          {
            id: new Types.ObjectId().toString(),
            title: 'Stale Spec',
            status: 'STALE',
            reason: 'Unreviewed for 95 days',
          },
        ],
      });

      const res = await supertest(app)
        .post(`/api/v1/projects/${projectIdA}/governance/gate-check`)
        .set('Authorization', `Bearer ${rawToken}`);

      expect(res.status).toBe(412);
      expect(res.body.error).toBe('DOCUMENTATION_GATE_BLOCKED');
      expect(res.body.data.passed).toBe(false);
      expect(auditService.createDocumentAudit).toHaveBeenCalled();
    });

    it('should return 403 Forbidden if Project A token is used on Project B (Project IDOR protection)', async () => {
      const mockProjectB = {
        _id: new Types.ObjectId(projectIdB),
        isArchived: false,
        gateTokens: [], // Project B does NOT have tokenHash
      };

      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProjectB as any);
      vi.spyOn(Project, 'exists').mockResolvedValue({ _id: new Types.ObjectId(projectIdA) } as any); // Token belongs to Project A

      const res = await supertest(app)
        .post(`/api/v1/projects/${projectIdB}/governance/gate-check`)
        .set('Authorization', `Bearer ${rawToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 Unauthorized for expired gate token', async () => {
      const mockProject = {
        _id: new Types.ObjectId(projectIdA),
        isArchived: false,
        gateTokens: [
          {
            _id: new Types.ObjectId(),
            tokenHash,
            expiresAt: new Date(Date.now() - 10000),
            revokedAt: null,
          },
        ],
      };

      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);

      const res = await supertest(app)
        .post(`/api/v1/projects/${projectIdA}/governance/gate-check`)
        .set('Authorization', `Bearer ${rawToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('GATE_TOKEN_EXPIRED');
    });

    it('should return 401 Unauthorized for revoked gate token', async () => {
      const mockProject = {
        _id: new Types.ObjectId(projectIdA),
        isArchived: false,
        gateTokens: [
          {
            _id: new Types.ObjectId(),
            tokenHash,
            expiresAt: null,
            revokedAt: new Date(),
          },
        ],
      };

      vi.spyOn(Project, 'findOne').mockResolvedValue(mockProject as any);

      const res = await supertest(app)
        .post(`/api/v1/projects/${projectIdA}/governance/gate-check`)
        .set('Authorization', `Bearer ${rawToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('GATE_TOKEN_REVOKED');
    });
  });
});
