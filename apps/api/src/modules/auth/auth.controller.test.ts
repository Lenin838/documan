import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockLoginUser,
  mockRefreshAccessToken,
  mockLogoutUser,
  mockLogoutAllSessions,
} = vi.hoisted(() => {
  process.env.MONGO_URI =
    'mongodb://127.0.0.1:27017/documan_test';

  process.env.JWT_SECRET =
    'test-secret-that-is-at-least-32-characters-long';

  return {
    mockLoginUser: vi.fn(),
    mockRefreshAccessToken: vi.fn(),
    mockLogoutUser: vi.fn(),
    mockLogoutAllSessions: vi.fn(),
  };
});

vi.mock('./auth.service.js', () => ({
  loginUser: mockLoginUser,
  refreshAccessToken: mockRefreshAccessToken,
  logoutUser: mockLogoutUser,
  logoutAllSessions: mockLogoutAllSessions,
}));

import {
  loginController,
  refreshController,
  logoutController,
  logoutAllController,
} from './auth.controller.js';

function createMockResponse() {
  const res = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;

  vi.mocked(res.status).mockReturnValue(res);
  vi.mocked(res.json).mockReturnValue(res);

  return res;
}

function createMockNext() {
  return vi.fn() as unknown as NextFunction;
}

function createMockRequest(
  overrides: Partial<Request> = {},
): Request {
  return {
    ...overrides,
  } as Request;
}

describe('auth controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loginController', () => {
    it('should login successfully and set the refresh token cookie', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      mockLoginUser.mockResolvedValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'user@example.com',
          role: 'user',
          isActive: true,
        },
      });

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'password123',
        },
      });

      await loginController(req, res, next);

      expect(mockLoginUser).toHaveBeenCalledWith(req.body);

      expect(res.cookie).toHaveBeenCalledWith(
        'documan_refresh_token',
        'refresh-token-123',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth',
        }),
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          accessToken: 'access-token-123',
          user: {
            id: 'user-123',
            name: 'Test User',
            email: 'user@example.com',
            role: 'user',
            isActive: true,
          },
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass login errors to next', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      const error = new Error(
        'Invalid email or password',
      );

      mockLoginUser.mockRejectedValue(error);

      const req = createMockRequest({
        body: {
          email: 'user@example.com',
          password: 'wrong-password',
        },
      });

      await loginController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('refreshController', () => {
    it('should reject when refresh token cookie is missing', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      const req = createMockRequest({
        cookies: {},
      });

      await refreshController(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required',
        }),
      );

      expect(
        mockRefreshAccessToken,
      ).not.toHaveBeenCalled();
    });

    it('should refresh successfully and rotate the refresh token cookie', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      mockRefreshAccessToken.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const req = createMockRequest({
        cookies: {
          documan_refresh_token: 'old-refresh-token',
        },
      });

      await refreshController(req, res, next);

      expect(
        mockRefreshAccessToken,
      ).toHaveBeenCalledWith(
        'old-refresh-token',
      );

      expect(res.cookie).toHaveBeenCalledWith(
        'documan_refresh_token',
        'new-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth',
        }),
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          accessToken: 'new-access-token',
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass refresh service errors to next', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      const error = new Error(
        'Refresh token reuse detected',
      );

      mockRefreshAccessToken.mockRejectedValue(error);

      const req = createMockRequest({
        cookies: {
          documan_refresh_token:
            'reused-refresh-token',
        },
      });

      await refreshController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('logoutController', () => {
    it('should logout successfully and clear the refresh token cookie', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      mockLogoutUser.mockResolvedValue(undefined);

      const req = createMockRequest({
        cookies: {
          documan_refresh_token: 'refresh-token-123',
        },
      });

      await logoutController(req, res, next);

      expect(mockLogoutUser).toHaveBeenCalledWith(
        'refresh-token-123',
      );

      expect(res.clearCookie).toHaveBeenCalledWith(
        'documan_refresh_token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth',
        }),
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should logout even when the refresh token cookie is missing', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      const req = createMockRequest({
        cookies: {},
      });

      await logoutController(req, res, next);

      expect(mockLogoutUser).not.toHaveBeenCalled();

      expect(res.clearCookie).toHaveBeenCalledWith(
        'documan_refresh_token',
        expect.objectContaining({
          path: '/api/v1/auth',
        }),
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    });

    it('should pass logout errors to next', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      const error = new Error('Logout failed');

      mockLogoutUser.mockRejectedValue(error);

      const req = createMockRequest({
        cookies: {
          documan_refresh_token: 'refresh-token-123',
        },
      });

      await logoutController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('logoutAllController', () => {
    it('should reject when the user is not authenticated', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      const req = createMockRequest({});
      await logoutAllController(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        }),
      );

      expect(
        mockLogoutAllSessions,
      ).not.toHaveBeenCalled();
    });

    it('should logout all sessions and clear the refresh cookie', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      mockLogoutAllSessions.mockResolvedValue(
        undefined,
      );

      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'admin',
        },
      });

      await logoutAllController(req, res, next);

      expect(
        mockLogoutAllSessions,
      ).toHaveBeenCalledWith('user-123');

      expect(res.clearCookie).toHaveBeenCalledWith(
        'documan_refresh_token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth',
        }),
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message:
            'Logged out from all sessions successfully',
        },
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass logout-all errors to next', async () => {
      const res = createMockResponse();
      const next = createMockNext();

      const error = new Error('Logout all failed');

      mockLogoutAllSessions.mockRejectedValue(error);

      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'admin',
        },
      });

      await logoutAllController(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.clearCookie).not.toHaveBeenCalled();
    });
  });
});