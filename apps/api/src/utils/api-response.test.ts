import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import {
  sendError,
  sendSuccess,
} from './api-response.js';

describe('sendSuccess', () => {
  it('should send a successful response with default status 200', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
        json,
    });

    const res = {
        status,
    } as unknown as Response;

    const data = {
        id: 'user-123',
        name: 'Lenin',
    };

    sendSuccess(res, data);

    expect(status).toHaveBeenCalledWith(200);

    expect(json).toHaveBeenCalledWith({
        success: true,
        data,
    });
   });

  it('should send a successful response with a custom status code', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
      json,
    });

    const res = {
      status,
    } as unknown as Response;

    const data = {
      message: 'User created',
    };

    sendSuccess(res, data, 201);

    expect(status).toHaveBeenCalledWith(201);

    expect(json).toHaveBeenCalledWith({
      success: true,
      data,
    });
  });

  it('should support primitive data', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
      json,
    });

    const res = {
      status,
    } as unknown as Response;

    sendSuccess(res, 'success');

    expect(json).toHaveBeenCalledWith({
      success: true,
      data: 'success',
    });
  });

  it('should support null data', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
        json,
    });

    const res = {
        status,
    } as unknown as Response;

    sendSuccess(res, null);

    expect(json).toHaveBeenCalledWith({
      success: true,
      data: null,
    });
  });
});

describe('sendError', () => {
  it('should send an error response with default status 500', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
      json,
    });

    const res = {
      status,
    } as unknown as Response;

    sendError(
      res,
      'INTERNAL_SERVER_ERROR',
      'Something went wrong',
    );

    expect(status).toHaveBeenCalledWith(500);

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong',
      },
    });
  });

  it('should send an error response with a custom status code', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
      json,
    });

    const res = {
      status,
    } as unknown as Response;

    sendError(
      res,
      'USER_NOT_FOUND',
      'User not found',
      404,
    );

    expect(status).toHaveBeenCalledWith(404);

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      },
    });
  });

  it('should include requestId when provided', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
      json,
    });

    const res = {
      status,
    } as unknown as Response;

    sendError(
      res,
      'VALIDATION_ERROR',
      'Validation failed',
      400,
      'req_123',
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        requestId: 'req_123',
      },
    });
  });

  it('should include details when provided', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
      json,
    });

    const res = {
      status,
    } as unknown as Response;

    const details = [
      {
        field: 'email',
        message: 'Invalid email address',
      },
    ];

    sendError(
      res,
      'VALIDATION_ERROR',
      'Validation failed',
      400,
      undefined,
      details,
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details,
      },
    });
  });

  it('should include both requestId and details when provided', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
      json,
    });

    const res = {
      status,
    } as unknown as Response;

    const details = {
      field: 'email',
      message: 'Invalid email',
    };

    sendError(
      res,
      'VALIDATION_ERROR',
      'Validation failed',
      400,
      'req_456',
      details,
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        requestId: 'req_456',
        details,
      },
    });
  });

  it('should omit requestId when it is not provided', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
      json,
    });

    const res = {
      status,
    } as unknown as Response;

    sendError(
      res,
      'BAD_REQUEST',
      'Bad request',
      400,
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Bad request',
      },
    });
  });

  it('should omit details when it is not provided', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({
      json,
    });

    const res = {
      status,
    } as unknown as Response;

    sendError(
      res,
      'BAD_REQUEST',
      'Bad request',
      400,
    );

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Bad request',
      },
    });
  });
});