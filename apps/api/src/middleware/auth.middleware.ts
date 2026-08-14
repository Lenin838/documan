import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

interface AccessTokenPayload {
  userId: string;
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return next(
      new AppError(
        'Authentication required',
        401,
        'AUTHENTICATION_REQUIRED',
      ),
    );
  }

  const token = authorization.slice(7);

  try {
    const payload = jwt.verify(
      token,
      env.JWT_SECRET,
    ) as AccessTokenPayload;

    if (!payload.userId) {
      return next(
        new AppError(
          'Invalid authentication token',
          401,
          'INVALID_TOKEN',
        ),
      );
    }

    req.user = {
      userId: payload.userId,
    };

    return next();
  } catch {
    return next(
      new AppError(
        'Invalid or expired authentication token',
        401,
        'INVALID_TOKEN',
      ),
    );
  }
};