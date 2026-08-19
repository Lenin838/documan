import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import {
  generateRefreshToken,
  hashRefreshToken,
} from '../../utils/refresh-token.js';
import { generateAccessToken } from '../../utils/jwt.js';
import { RefreshToken } from './refresh-token.model.js';
import type { LoginInput } from './auth.schema.js';
import { User } from '../users/user.model.js';

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({
    email: input.email.toLowerCase(),
  });

  if (!user) {
    throw new AppError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  if (!user.isActive) {
    throw new AppError(
      'User account is inactive',
      403,
      'ACCOUNT_INACTIVE',
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const familyId = randomUUID();

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  );

  await RefreshToken.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    familyId,
    expiresAt,
    revokedAt: null,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  };
}

export async function refreshAccessToken(
  refreshToken: string,
) {
  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await RefreshToken.findOne({
    tokenHash,
  });

  if (!storedToken) {
    throw new AppError(
      'Invalid refresh token',
      401,
      'INVALID_REFRESH_TOKEN',
    );
  }

  if (storedToken.revokedAt) {
    await RefreshToken.updateMany(
      {
        userId: storedToken.userId,
        familyId: storedToken.familyId,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      },
    );

    throw new AppError(
      'Refresh token reuse detected',
      401,
      'REFRESH_TOKEN_REUSE_DETECTED',
    );
  }

  if (storedToken.expiresAt <= new Date()) {
    throw new AppError(
      'Refresh token has expired',
      401,
      'REFRESH_TOKEN_EXPIRED',
    );
  }

  const user = await User.findById(storedToken.userId);

  if (!user) {
    throw new AppError(
      'User not found',
      401,
      'INVALID_REFRESH_TOKEN',
    );
  }

  if (!user.isActive) {
    throw new AppError(
      'User account is inactive',
      403,
      'ACCOUNT_INACTIVE',
    );
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  );

  await RefreshToken.create({
    userId: user._id,
    tokenHash: newRefreshTokenHash,
    familyId: storedToken.familyId,
    expiresAt,
    revokedAt: null,
  });

  const accessToken = generateAccessToken(user.id);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logoutUser(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);

  await RefreshToken.findOneAndUpdate(
    {
      tokenHash,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}

export async function logoutAllSessions(userId: string) {
  await RefreshToken.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );
}