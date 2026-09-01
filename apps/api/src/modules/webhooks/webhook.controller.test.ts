import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import supertest from 'supertest';

process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/documan_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_32_bytes_long';

import * as webhookService from './webhook.service.js';

let app: express.Application;

describe('Webhook API Endpoints (/api/v1/projects/:projectId/webhooks)', () => {
  const userId = new Types.ObjectId().toString();
  const projectId = new Types.ObjectId().toString();
  const webhookId = new Types.ObjectId().toString();

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

  describe('POST /api/v1/projects/:projectId/webhooks', () => {
    it('should create webhook and return 201 with one-time secret', async () => {
      vi.spyOn(webhookService, 'createWebhook').mockResolvedValue({
        id: webhookId,
        projectId,
        url: 'https://example.com/wh',
        events: ['*'],
        isEnabled: true,
        consecutiveFailures: 0,
        secretMasked: 'doc_whsec_...1234',
        secretPlaintextOnce: 'doc_whsec_secret1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await supertest(app)
        .post(`/api/v1/projects/${projectId}/webhooks`)
        .send({
          url: 'https://example.com/wh',
          events: ['*'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secretPlaintextOnce).toBe('doc_whsec_secret1234567890');
    });

    it('should return 400 for non-HTTPS URL', async () => {
      const res = await supertest(app)
        .post(`/api/v1/projects/${projectId}/webhooks`)
        .send({
          url: 'http://example.com/wh',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/projects/:projectId/webhooks', () => {
    it('should list project webhooks with masked secrets', async () => {
      vi.spyOn(webhookService, 'getProjectWebhooks').mockResolvedValue([
        {
          id: webhookId,
          projectId,
          url: 'https://example.com/wh',
          events: ['*'],
          isEnabled: true,
          consecutiveFailures: 0,
          secretMasked: 'doc_whsec_...1234',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await supertest(app).get(`/api/v1/projects/${projectId}/webhooks`);

      expect(res.status).toBe(200);
      expect(res.body.data.webhooks).toHaveLength(1);
      expect(res.body.data.webhooks[0].secretMasked).toBe('doc_whsec_...1234');
      expect(res.body.data.webhooks[0].secretPlaintextOnce).toBeUndefined();
    });
  });

  describe('POST /api/v1/projects/:projectId/webhooks/:id/rotate-secret', () => {
    it('should rotate secret and return 200 with new plaintext secret once', async () => {
      vi.spyOn(webhookService, 'rotateWebhookSecret').mockResolvedValue({
        id: webhookId,
        projectId,
        url: 'https://example.com/wh',
        events: ['*'],
        isEnabled: true,
        consecutiveFailures: 0,
        secretMasked: 'doc_whsec_...9999',
        secretPlaintextOnce: 'doc_whsec_newsecret9999',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await supertest(app).post(
        `/api/v1/projects/${projectId}/webhooks/${webhookId}/rotate-secret`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.secretPlaintextOnce).toBe('doc_whsec_newsecret9999');
    });
  });
});
