import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/documan_test';
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
});

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

vi.mock('../modules/documents/document.routes.js', () => {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.status(200).json({ route: 'documents' });
  });

  return {
    documentRouter: router,
  };
});

vi.mock('../modules/folders/folder.routes.js', () => {
  const router = express.Router();

  router.get('/', (_req, res) => {
    res.status(200).json({ route: 'folders' });
  });

  return {
    folderRouter: router,
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
    const response = await request(app).get(
      '/api/v1/health',
    );

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      route: 'health',
    });
  });

  it('should mount the users router', async () => {
    const response = await request(app).get(
      '/api/v1/users',
    );

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      route: 'users',
    });
  });

  it('should mount the auth router', async () => {
    const response = await request(app).post(
      '/api/v1/auth/login',
    );

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      route: 'auth',
    });
  });

  it('should mount the documents router', async () => {
    const response = await request(app).get(
      '/api/v1/documents',
    );

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      route: 'documents',
    });
  });

  it('should mount the folders router', async () => {
    const response = await request(app).get(
      '/api/v1/folders',
    );

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      route: 'folders',
    });
  });

  it('should return 404 for an unknown route', async () => {
    const response = await request(app).get(
      '/api/v1/unknown',
    );

    expect(response.status).toBe(404);
  });
});