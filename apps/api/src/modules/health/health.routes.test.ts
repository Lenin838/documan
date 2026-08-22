import express from 'express';
import request from 'supertest';

import { describe, expect, it } from 'vitest';

import { healthRouter } from './health.routes.js';

function createApp() {
  const app = express();

  app.use('/health', healthRouter);

  return app;
}

describe('healthRouter', () => {
  it('should return health status on GET /health', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/health');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
        service: 'documan-api',
      },
    });
  });

  it('should return 404 for unsupported methods', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/health');

    expect(response.status).toBe(404);
  });
});