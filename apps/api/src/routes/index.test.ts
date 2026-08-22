import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../modules/health/health.routes.js', () => {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.status(200).json({ route: 'health' });
  });

  return {
    healthRouter: router,
  };
});

vi.mock('../modules/users/user.routes.js', () => {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.status(200).json({ route: 'users' });
  });

  return {
    userRouter: router,
  };
});

vi.mock('../modules/auth/auth.routes.js', () => {
  const router = express.Router();

  router.post('/login', (_req, res) => {
    res.status(200).json({ route: 'auth' });
  });

  return {
    authRouter: router,
  };
});

import { apiRouter } from './index.js';

function createTestApp() {
  const app = express();

  app.use('/api/v1', apiRouter);

  return app;
}

describe('apiRouter', () => {
  const app = createTestApp();

  it('should mount the health router', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      route: 'health',
    });
  });

  it('should mount the users router', async () => {
    const response = await request(app).get('/api/v1/users');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      route: 'users',
    });
  });

  it('should mount the auth router', async () => {
    const response = await request(app).post('/api/v1/auth/login');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      route: 'auth',
    });
  });

  it('should return 404 for an unknown route', async () => {
    const response = await request(app).get('/api/v1/unknown');

    expect(response.status).toBe(404);
  });
});