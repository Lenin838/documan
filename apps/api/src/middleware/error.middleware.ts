import type { ErrorRequestHandler } from 'express';

import { logger } from '../config/logger.js';
import { AppError } from '../errors/app-error.js';
import { sendError } from '../utils/api-response.js';

export const errorMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  const requestId = req.requestId;

  if (error instanceof AppError) {
    logger.error(
      {
        requestId,
        errorCode: error.code,
        statusCode: error.statusCode,
        error: error.message,
      },
      'Application error',
    );

    return sendError(
      res,
      error.code,
      error.message,
      error.statusCode,
      requestId,
    );
  }

  logger.error(
    {
      requestId,
      error,
    },
    'Unhandled application error',
  );

  return sendError(
    res,
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred',
    500,
    requestId,
  );
};