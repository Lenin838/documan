import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockLoginController,
  mockRefreshController,
  mockLogoutController,
  mockLogoutAllController,
  mockAuthenticate,
  mockLoginRateLimiter,
  mockRefreshRateLimiter,
} = vi.hoisted(() => ({
  mockLoginController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'login',
    });
  }),

  mockRefreshController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'refresh',
    });
  }),

  mockLogoutController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'logout',
    });
  }),

  mockLogoutAllController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'logout-all',
    });
  }),

  mockAuthenticate: vi.fn((_req, _res, next) => {
    next();
  }),

  mockLoginRateLimiter: vi.fn((_req, _res, next) => {
    next();
  }),

  mockRefreshRateLimiter: vi.fn((_req, _res, next) => {
    next();
  }),
}));

vi.mock('./auth.controller.js', () => ({
  loginController: mockLoginController,
  refreshController: mockRefreshController,
  logoutController: mockLogoutController,
  logoutAllController: mockLogoutAllController,
}));

vi.mock('../../middleware/auth.middleware.js', () => ({
  authenticate: mockAuthenticate,
}));

vi.mock('../../middleware/rate-limit.middleware.js', () => ({
  loginRateLimiter: mockLoginRateLimiter,
  refreshRateLimiter: mockRefreshRateLimiter,
}));

vi.mock('../../middleware/validate.middleware.js', () => ({
  validateBody: vi.fn(
    () =>
      (
        _req: Request,
        _res: Response,
        next: NextFunction,
      ) => {
        next();
      },
    ),
}));

import { authRouter } from './auth.routes.js';

function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/auth', authRouter);

  return app;
}

describe('authRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /login', () => {
    it('should route the request to login controller', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBe('login');
      expect(mockLoginController).toHaveBeenCalledTimes(1);
    });

    it('should apply the login rate limiter', async () => {
      const app = createApp();

      await request(app)
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123',
        });

      expect(mockLoginRateLimiter).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /refresh', () => {
    it('should route the request to refresh controller', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/auth/refresh');

      expect(response.status).toBe(200);
      expect(response.body.data).toBe('refresh');
      expect(mockRefreshController).toHaveBeenCalledTimes(1);
    });

    it('should apply the refresh rate limiter', async () => {
      const app = createApp();

      await request(app)
        .post('/auth/refresh');

      expect(mockRefreshRateLimiter).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /logout', () => {
    it('should route the request to logout controller', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.data).toBe('logout');
      expect(mockLogoutController).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /logout-all', () => {
    it('should route the request to logout all controller', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/auth/logout-all');

      expect(response.status).toBe(200);
      expect(response.body.data).toBe('logout-all');
      expect(mockLogoutAllController).toHaveBeenCalledTimes(1);
    });

    it('should apply authentication middleware', async () => {
      const app = createApp();

      await request(app)
        .post('/auth/logout-all');

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    });
  });

  it('should return 404 for an unsupported auth route', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/auth/unknown');

    expect(response.status).toBe(404);
  });
});