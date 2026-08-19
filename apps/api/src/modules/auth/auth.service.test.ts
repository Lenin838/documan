import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
const {
  mockRefreshToken,
  mockUser,
} = vi.hoisted(() => {
  process.env.MONGO_URI =
    'mongodb://127.0.0.1:27017/documan_test';

  process.env.JWT_SECRET =
    'test-secret-that-is-at-least-32-characters-long';

  return {
    mockRefreshToken: {
      findOne: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findOneAndUpdate: vi.fn(),
    },

    mockUser: {
      findOne: vi.fn(),
      findById: vi.fn(),
    },
  };
});

vi.mock('./refresh-token.model.js', () => ({
  RefreshToken: mockRefreshToken,
}));

vi.mock('../users/user.model.js', () => ({
  User: mockUser,
}));

import {
  loginUser,
  logoutAllSessions,
  logoutUser,
  refreshAccessToken,
} from './auth.service.js';

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('refreshAccessToken', () => {
    it('should reject an invalid refresh token', async () => {
      mockRefreshToken.findOne.mockResolvedValue(null);

      await expect(
        refreshAccessToken('invalid-token'),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    });

    it('should revoke the entire token family when reuse is detected', async () => {
      const userId = 'user-123';
      const familyId = 'family-123';

      mockRefreshToken.findOne.mockResolvedValue({
        userId,
        familyId,
        revokedAt: new Date(),
      });

      mockRefreshToken.updateMany.mockResolvedValue({
        modifiedCount: 2,
      });

      await expect(
        refreshAccessToken('reused-token'),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'REFRESH_TOKEN_REUSE_DETECTED',
      });

      expect(mockRefreshToken.updateMany).toHaveBeenCalledWith(
        {
          userId,
          familyId,
          revokedAt: null,
        },
        {
          $set: expect.objectContaining({
            revokedAt: expect.any(Date),
          }),
        },
      );
    });

    it('should reject an expired refresh token', async () => {
      mockRefreshToken.findOne.mockResolvedValue({
        userId: 'user-123',
        familyId: 'family-123',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        refreshAccessToken('expired-token'),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'REFRESH_TOKEN_EXPIRED',
      });
    });
  });

  describe('logoutUser', () => {
    it('should revoke the current refresh token', async () => {
      mockRefreshToken.findOneAndUpdate.mockResolvedValue({
        modifiedCount: 1,
      });

      await logoutUser('refresh-token');

      expect(
        mockRefreshToken.findOneAndUpdate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: expect.any(String),
          revokedAt: null,
        }),
        {
          $set: {
            revokedAt: expect.any(Date),
          },
        },
      );
    });
  });

  describe('logoutAllSessions', () => {
    it('should revoke all active refresh tokens for a user', async () => {
      mockRefreshToken.updateMany.mockResolvedValue({
        modifiedCount: 3,
      });

      await logoutAllSessions('user-123');

      expect(mockRefreshToken.updateMany).toHaveBeenCalledWith(
        {
          userId: 'user-123',
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: expect.any(Date),
          },
        },
      );
    });
  });
  describe('loginUser', () => {
    it('should reject when the user does not exist', async () => {
        mockUser.findOne.mockResolvedValue(null);

        await expect(
        loginUser({
            email: 'missing@example.com',
            password: 'password123',
        }),
        ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        });

        expect(mockUser.findOne).toHaveBeenCalledWith({
        email: 'missing@example.com',
        });
    });

    it('should reject an inactive user', async () => {
        mockUser.findOne.mockResolvedValue({
        isActive: false,
        });

        await expect(
        loginUser({
            email: 'inactive@example.com',
            password: 'password123',
        }),
        ).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        });
    });

    it('should reject an incorrect password', async () => {
        mockUser.findOne.mockResolvedValue({
        isActive: true,
        passwordHash: await bcrypt.hash(
            'correct-password',
            4,
        ),
        });

        await expect(
        loginUser({
            email: 'user@example.com',
            password: 'wrong-password',
        }),
        ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        });
    });

    it('should successfully log in and create a refresh token', async () => {
        const user = {
        _id: 'user-123',
        id: 'user-123',
        name: 'Test User',
        email: 'user@example.com',
        role: 'user' as const,
        isActive: true,
        passwordHash: await bcrypt.hash(
            'password123',
            4,
        ),
        };

        mockUser.findOne.mockResolvedValue(user);

        mockRefreshToken.create.mockResolvedValue({
        userId: user._id,
        });

        const result = await loginUser({
        email: 'user@example.com',
        password: 'password123',
        });

        expect(result.accessToken).toBeTypeOf('string');
        expect(result.refreshToken).toBeTypeOf('string');

        expect(result.user).toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        });

        expect(mockRefreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
            userId: user._id,
            tokenHash: expect.any(String),
            familyId: expect.any(String),
            expiresAt: expect.any(Date),
            revokedAt: null,
        }),
        );
    });
    });
});