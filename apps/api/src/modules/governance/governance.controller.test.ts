import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import supertest from 'supertest';

process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/documan_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_32_bytes_long';

import * as governanceService from './governance.service.js';

let app: express.Application;

describe('Governance API Endpoints (/api/v1/projects/:projectId/governance)', () => {
  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();
  const documentId = new Types.ObjectId().toString();

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

  describe('GET /api/v1/projects/:projectId/governance', () => {
    it('should return project governance metrics and settings', async () => {
      vi.spyOn(governanceService, 'getProjectGovernance').mockResolvedValue({
        projectId,
        governanceSettings: {
          isGovernanceEnabled: true,
          maxUnreviewedDays: 90,
          autoMarkStaleOnUpstreamChange: true,
        },
        health: {
          totalDocuments: 10,
          eligibleDocuments: 8,
          approvedFreshCount: 7,
          staleCount: 1,
          freshnessPercentage: 88,
        },
      });

      const res = await supertest(app).get(`/api/v1/projects/${projectId}/governance`);

      expect(res.status).toBe(200);
      expect(res.body.data.health.freshnessPercentage).toBe(88);
    });
  });

  describe('PATCH /api/v1/projects/:projectId/governance', () => {
    it('should update governance settings and return 200', async () => {
      vi.spyOn(governanceService, 'updateProjectGovernance').mockResolvedValue({
        projectId,
        governanceSettings: {
          isGovernanceEnabled: true,
          maxUnreviewedDays: 30,
          autoMarkStaleOnUpstreamChange: true,
        },
        health: {
          totalDocuments: 10,
          eligibleDocuments: 8,
          approvedFreshCount: 5,
          staleCount: 3,
          freshnessPercentage: 63,
        },
      });

      const res = await supertest(app)
        .patch(`/api/v1/projects/${projectId}/governance`)
        .send({ maxUnreviewedDays: 30 });

      expect(res.status).toBe(200);
      expect(res.body.data.governanceSettings.maxUnreviewedDays).toBe(30);
    });
  });

  describe('POST /api/v1/documents/:id/confirm-freshness', () => {
    it('should confirm freshness and return 200', async () => {
      vi.spyOn(governanceService, 'confirmDocumentFreshness').mockResolvedValue({
        id: documentId,
        title: 'Fresh Doc',
        status: 'APPROVED',
        lastReviewedAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await supertest(app).post(`/api/v1/documents/${documentId}/confirm-freshness`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });
});
