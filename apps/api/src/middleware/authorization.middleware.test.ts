import type { Request } from 'express';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireRole } from './authorization.middleware.js';

function createMockRequest(
  overrides: Partial<Request> = {},
): Request {
  return {
    ...overrides,
  } as Request;
}

function createMockNext() {
  return vi.fn();
}

describe('requireRole middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject when the user is not authenticated', () => {
    const req = createMockRequest({});
    const next = createMockNext();

    const middleware = requireRole('admin');

    middleware(req, {} as never, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      }),
    );
  });

  it('should allow an authenticated user with the required role', () => {
    const req = createMockRequest({
      user: {
        userId: 'user-123',
        role: 'admin',
      },
    });

    const next = createMockNext();

    const middleware = requireRole('admin');

    middleware(req, {} as never, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should reject an authenticated user with an unauthorized role', () => {
    const req = createMockRequest({
      user: {
        userId: 'user-123',
        role: 'user',
      },
    });

    const next = createMockNext();

    const middleware = requireRole('admin');

    middleware(req, {} as never, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'FORBIDDEN',
        message:
          'You do not have permission to access this resource',
      }),
    );
  });

  it('should allow any role included in the allowed roles', () => {
    const req = createMockRequest({
      user: {
        userId: 'user-123',
        role: 'user',
      },
    });

    const next = createMockNext();

    const middleware = requireRole('admin', 'user');

    middleware(req, {} as never, next);

    expect(next).toHaveBeenCalledWith();
  });
});