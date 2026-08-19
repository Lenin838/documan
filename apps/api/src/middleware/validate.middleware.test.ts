import type { Request, Response } from 'express';
import { z } from 'zod';

import { describe, expect, it, vi } from 'vitest';

import {
  validateBody,
  validateQuery,
  validateParams,
} from './validate.middleware.js';

function createMockRequest(
  overrides: Partial<Request> = {},
): Request {
  return {
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as Request;
}

function createMockResponse(): Response {
  return {
    locals: {},
  } as Response;
}

function createMockNext() {
  return vi.fn();
}

describe('validateBody', () => {
  const schema = z.object({
    email: z.string().email(),
    age: z.coerce.number().positive(),
  });

  it('should call next and assign parsed data to req.body', () => {
    const req = createMockRequest({
      body: {
        email: 'user@example.com',
        age: '25',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateBody(schema);

    middleware(req, res, next);

    expect(req.body).toEqual({
      email: 'user@example.com',
      age: 25,
    });

    expect(next).toHaveBeenCalledWith();
  });

  it('should pass a validation error to next for invalid body', () => {
    const req = createMockRequest({
      body: {
        email: 'invalid-email',
        age: '-5',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateBody(schema);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      }),
    );

    const error = next.mock.calls[0]?.[0];

    expect(error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
        }),
        expect.objectContaining({
          field: 'age',
        }),
      ]),
    );
  });
});

describe('validateQuery', () => {
  const schema = z.object({
    page: z.coerce.number().int().positive(),
    search: z.string().optional(),
  });

  it('should validate query and store parsed data in res.locals', () => {
    const req = createMockRequest({
      query: {
        page: '2',
        search: 'john',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateQuery(schema);

    middleware(req, res, next);

    expect(res.locals.validatedQuery).toEqual({
      page: 2,
      search: 'john',
    });

    expect(next).toHaveBeenCalledWith();
  });

  it('should pass a validation error to next for invalid query', () => {
    const req = createMockRequest({
      query: {
        page: 'invalid',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateQuery(schema);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      }),
    );

    expect(res.locals.validatedQuery).toBeUndefined();
  });
});

describe('validateParams', () => {
  const schema = z.object({
    id: z.string().min(1),
  });

  it('should validate params and store parsed data in res.locals', () => {
    const req = createMockRequest({
      params: {
        id: 'user-123',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateParams(schema);

    middleware(req, res, next);

    expect(res.locals.validatedParams).toEqual({
      id: 'user-123',
    });

    expect(next).toHaveBeenCalledWith();
  });

  it('should pass a validation error to next for invalid params', () => {
    const req = createMockRequest({
      params: {
        id: '',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    const middleware = validateParams(schema);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      }),
    );

    expect(res.locals.validatedParams).toBeUndefined();
  });
});