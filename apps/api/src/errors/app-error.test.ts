import { describe, expect, it } from 'vitest';

import { AppError } from './app-error.js';

describe('AppError', () => {
  it('should create an AppError with the provided values', () => {
    const error = new AppError(
      'User not found',
      404,
      'USER_NOT_FOUND',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);

    expect(error.message).toBe('User not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('USER_NOT_FOUND');
    expect(error.name).toBe('AppError');
  });

  it('should use default status code', () => {
    const error = new AppError('Something went wrong');

    expect(error.statusCode).toBe(500);
  });

  it('should use default error code', () => {
    const error = new AppError('Something went wrong');

    expect(error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should allow custom status code without custom code', () => {
    const error = new AppError(
      'Unauthorized',
      401,
    );

    expect(error.statusCode).toBe(401);
    expect(error.code).toBe(
      'INTERNAL_SERVER_ERROR',
    );
  });

  it('should store error details', () => {
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
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      details,
    );

    expect(error.details).toEqual(details);
  });

  it('should leave details undefined when not provided', () => {
    const error = new AppError('Something went wrong');

    expect(error.details).toBeUndefined();
  });

  it('should have a stack trace', () => {
    const error = new AppError('Something went wrong');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });

  it('should preserve an empty details array', () => {
    const error = new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      [],
    );

    expect(error.details).toEqual([]);
  });
});