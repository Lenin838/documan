import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '../errors/app-error.js';

function createValidationError(
  issues: {
    path: PropertyKey[];
    message: string;
  }[],
) {
  const details = issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return new AppError(
    'Request validation failed',
    400,
    'VALIDATION_ERROR',
    details,
  );
}

export function validateBody<T>(
  schema: ZodType<T>,
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError(result.error.issues));
    }

    req.body = result.data;

    return next();
  };
}

export function validateQuery<T>(
  schema: ZodType<T>,
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(createValidationError(result.error.issues));
    }

    res.locals.validatedQuery = result.data;

    return next();
  };
}

export function validateParams<T>(
  schema: ZodType<T>,
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return next(createValidationError(result.error.issues));
    }

    res.locals.validatedParams = result.data;

    return next();
  };
}