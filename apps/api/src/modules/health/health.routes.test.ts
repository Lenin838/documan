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

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.service).toBe('documan-api');
    expect(response.body.data.database).toBeDefined();
  });

  it('should return liveness status on GET /health/live', async () => {
    const app = createApp();

    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        live: true,
      },
    });
  });

  it('should return readiness status on GET /health/ready', async () => {
    const app = createApp();

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(503); // DB disconnected in unit test environment
    expect(response.body.data.ready).toBe(false);
  });

  it('should return 404 for unsupported methods', async () => {
    const app = createApp();

    const response = await request(app).post('/health');

    expect(response.status).toBe(404);
  });
});
