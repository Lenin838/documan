import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';

export interface AccessTokenPayload {
  userId: string;
}

export function generateAccessToken(userId: string): string {
  const payload: AccessTokenPayload = {
    userId,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as NonNullable<
      SignOptions['expiresIn']
    >,
  });
}