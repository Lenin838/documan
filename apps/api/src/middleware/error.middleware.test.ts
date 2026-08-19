import type { Request, Response } from 'express';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLogger } = vi.hoisted(() => {
  process.env.MONGO_URI =
    'mongodb://127.0.0.1:27017/documan_test';

  process.env.JWT_SECRET =
    'test-secret-that-is-at-least-32-characters-long';

  return {
    mockLogger: {
      error: vi.fn(),
    },
  };
});

vi.mock('../config/logger.js', () => ({
  logger: mockLogger,
}));

import { AppError } from '../errors/app-error.js';
import { errorMiddleware } from './error.middleware.js';

function createMockRequest(
  requestId?: string,
): Request {
  const req = {
    requestId,
  } as Request;

  if (requestId === undefined) {
    delete (req as { requestId?: string }).requestId;
  }

  return req;
}

function createMockResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };

  response.status.mockReturnValue(response);

  return response as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

function createMockNext() {
  return vi.fn();
}

describe('errorMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle an AppError and return its status, code, and message', () => {
    const req = createMockRequest('req_test_123');
    const res = createMockResponse();
    const next = createMockNext();

    const error = new AppError(
      'Authentication required',
      401,
      'AUTHENTICATION_REQUIRED',
    );

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
        requestId: 'req_test_123',
      },
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      {
        requestId: 'req_test_123',
        errorCode: 'AUTHENTICATION_REQUIRED',
        statusCode: 401,
        error: 'Authentication required',
      },
      'Application error',
    );

    expect(next).not.toHaveBeenCalled();
  });

  it('should include error details when an AppError has details', () => {
    const req = createMockRequest('req_validation_123');
    const res = createMockResponse();
    const next = createMockNext();

    const details = [
      {
        field: 'email',
        message: 'Invalid email address',
      },
      {
        field: 'password',
        message: 'Password is required',
      },
    ];

    const error = new AppError(
      'Request validation failed',
      400,
      'VALIDATION_ERROR',
      details,
    );

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        requestId: 'req_validation_123',
        details,
      },
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      {
        requestId: 'req_validation_123',
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
        error: 'Request validation failed',
      },
      'Application error',
    );
  });

  it('should omit requestId when the request does not have one', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    const error = new AppError(
      'Resource not found',
      404,
      'NOT_FOUND',
    );

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    });
  });

  it('should convert an unknown error into a generic 500 error', () => {
    const req = createMockRequest('req_internal_123');
    const res = createMockResponse();
    const next = createMockNext();

    const error = new Error('Database connection failed');

    errorMiddleware(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        requestId: 'req_internal_123',
      },
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      {
        requestId: 'req_internal_123',
        error,
      },
      'Unhandled application error',
    );

    expect(next).not.toHaveBeenCalled();
  });
});