import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

import { User } from '../modules/users/user.model.js';

interface AccessTokenPayload {
  userId: string;
}

export const authenticate: RequestHandler = async (
  req,
  _res,
  next,
) => {
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

    const user = await User.findById(payload.userId).select(
      'role isActive',
    );

    if (!user) {
      return next(
        new AppError(
          'User no longer exists',
          401,
          'INVALID_TOKEN',
        ),
      );
    }

    if (!user.isActive) {
      return next(
        new AppError(
          'User account is inactive',
          403,
          'ACCOUNT_INACTIVE',
        ),
      );
    }

    req.user = {
      userId: user.id,
      role: user.role,
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