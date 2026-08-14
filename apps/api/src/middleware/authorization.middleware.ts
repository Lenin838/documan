import type { RequestHandler } from 'express';

import { AppError } from '../errors/app-error.js';

type UserRole = 'user' | 'admin';

export function requireRole(
  ...allowedRoles: UserRole[]
): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED',
        ),
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to access this resource',
          403,
          'FORBIDDEN',
        ),
      );
    }

    return next();
  };
}