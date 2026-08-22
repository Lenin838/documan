import express from 'express';
import request from 'supertest';

import { describe, expect, it } from 'vitest';

import {
  loginRateLimiter,
  refreshRateLimiter,
} from './rate-limit.middleware.js';

function createLoginApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(loginRateLimiter);

  app.post('/login', (_req, res) => {
    return res.status(200).json({
      success: true,
    });
  });

  return app;
}

function createRefreshApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(refreshRateLimiter);

  app.post('/refresh', (_req, res) => {
    return res.status(200).json({
      success: true,
    });
  });

  return app;
}

describe('loginRateLimiter', () => {
  it('should allow a request within the configured limit', async () => {
    const app = createLoginApp();

    const response = await request(app)
      .post('/login')
      .set('X-Forwarded-For', '10.20.30.1');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
    });
  });

  it('should block requests after 5 attempts', async () => {
    const app = createLoginApp();

    const ip = '10.20.30.2';

    for (let i = 0; i < 5; i += 1) {
      const response = await request(app)
        .post('/login')
        .set('X-Forwarded-For', ip);

      expect(response.status).toBe(200);
    }

    const response = await request(app)
      .post('/login')
      .set('X-Forwarded-For', ip);

    expect(response.status).toBe(429);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
        message:
          'Too many login attempts. Please try again later.',
      },
    });
  });
});

describe('refreshRateLimiter', () => {
  it('should allow a request within the configured limit', async () => {
    const app = createRefreshApp();

    const response = await request(app)
      .post('/refresh')
      .set('X-Forwarded-For', '10.20.30.3');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
    });
  });

  it('should block requests after 10 attempts', async () => {
    const app = createRefreshApp();

    const ip = '10.20.30.4';

    for (let i = 0; i < 10; i += 1) {
      const response = await request(app)
        .post('/refresh')
        .set('X-Forwarded-For', ip);

      expect(response.status).toBe(200);
    }

    const response = await request(app)
      .post('/refresh')
      .set('X-Forwarded-For', ip);

    expect(response.status).toBe(429);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'TOO_MANY_REFRESH_ATTEMPTS',
        message:
          'Too many refresh attempts. Please try again later.',
      },
    });
  });
});