import { vi, describe, expect, it } from 'vitest';

vi.hoisted(() => {
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI =
    'mongodb://localhost:27017/documan-test';
  process.env.JWT_SECRET =
    'test-secret-key-that-is-at-least-32-characters-long';
});

import request from 'supertest';

import { app } from './app.js';

describe('app', () => {
  describe('middleware setup', () => {
    it('should parse JSON request bodies', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'short',
        });

      expect(response.status).toBe(400);
    });

    it('should include security headers from helmet', async () => {
      const response = await request(app).get(
        '/api/v1/health',
      );

      expect(
        response.headers['x-content-type-options'],
      ).toBe('nosniff');
    });

    it('should include a request id', async () => {
      const response = await request(app).get(
        '/api/v1/health',
      );

      const requestId =
        response.headers['x-request-id'];

      expect(requestId).toBeDefined();

      if (requestId === undefined) {
        throw new Error(
          'Expected x-request-id header',
        );
      }

      expect(typeof requestId).toBe('string');
      expect(requestId.length).toBeGreaterThan(0);
    });

    it('should accept a custom request id', async () => {
      const requestId = 'test-request-id';

      const response = await request(app)
        .get('/api/v1/health')
        .set('X-Request-ID', requestId);

      expect(response.status).toBe(200);
      expect(response.headers['x-request-id']).toBe(
        requestId,
      );
    });
  });

  describe('API routes', () => {
    it('should mount the API router under /api/v1', async () => {
      const response = await request(app).get(
        '/api/v1/health',
      );

      expect(response.status).toBe(200);
    });

    it('should return 404 for an unknown API route', async () => {
      const response = await request(app).get(
        '/api/v1/does-not-exist',
      );

      expect(response.status).toBe(404);
    });
  });

  describe('CORS', () => {
    it('should allow the configured CORS origin', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:5173');

      expect(
        response.headers['access-control-allow-origin'],
      ).toBe('http://localhost:5173');
    });
  });
});