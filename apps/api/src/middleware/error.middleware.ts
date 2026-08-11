import type { ErrorRequestHandler } from 'express';

import { logger } from '../config/logger.js';
import { AppError } from '../errors/app-error.js';

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

    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        requestId,
      },
    });

    return;
  }

  logger.error(
    {
      requestId,
      error,
    },
    'Unhandled application error',
  );

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      requestId,
    },
  });
};