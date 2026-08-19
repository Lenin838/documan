import type { Request, Response } from 'express';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVerify, mockFindById } = vi.hoisted(() => {
  process.env.MONGO_URI =
    'mongodb://127.0.0.1:27017/documan_test';

  process.env.JWT_SECRET =
    'test-secret-that-is-at-least-32-characters-long';

  return {
    mockVerify: vi.fn(),
    mockFindById: vi.fn(),
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: mockVerify,
  },
}));

vi.mock('../modules/users/user.model.js', () => ({
  User: {
    findById: mockFindById,
  },
}));

import { authenticate } from './auth.middleware.js';

function createMockRequest(
  overrides: Partial<Request> = {},
): Request {
  return {
    headers: {},
    ...overrides,
  } as Request;
}

function createMockResponse(): Response {
  return {} as Response;
}

function createMockNext() {
  return vi.fn();
}

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject when authorization header is missing', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      }),
    );

    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('should reject an invalid authorization format', async () => {
    const req = createMockRequest({
      headers: {
        authorization: 'Basic some-token',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
      }),
    );

    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('should reject when JWT verification fails', async () => {
    const req = createMockRequest({
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    mockVerify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authenticate(req, res, next);

    expect(mockVerify).toHaveBeenCalledWith(
      'invalid-token',
      process.env.JWT_SECRET,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message:
          'Invalid or expired authentication token',
      }),
    );

    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('should reject when JWT payload does not contain userId', async () => {
    const req = createMockRequest({
      headers: {
        authorization: 'Bearer token-without-user-id',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    mockVerify.mockReturnValue({});

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      }),
    );

    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('should reject when the user no longer exists', async () => {
    const req = createMockRequest({
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    mockVerify.mockReturnValue({
      userId: 'user-123',
    });

    mockFindById.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    await authenticate(req, res, next);

    expect(mockFindById).toHaveBeenCalledWith(
      'user-123',
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'INVALID_TOKEN',
        message: 'User no longer exists',
      }),
    );
  });

  it('should reject when the user account is inactive', async () => {
    const req = createMockRequest({
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    mockVerify.mockReturnValue({
      userId: 'user-123',
    });

    mockFindById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        id: 'user-123',
        role: 'user',
        isActive: false,
      }),
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'ACCOUNT_INACTIVE',
        message: 'User account is inactive',
      }),
    );
  });

  it('should authenticate an active user and populate req.user', async () => {
    const req = createMockRequest({
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    const res = createMockResponse();
    const next = createMockNext();

    mockVerify.mockReturnValue({
      userId: 'user-123',
    });

    mockFindById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        id: 'user-123',
        role: 'admin',
        isActive: true,
      }),
    });

    await authenticate(req, res, next);

    expect(mockVerify).toHaveBeenCalledWith(
      'valid-token',
      process.env.JWT_SECRET,
    );

    expect(mockFindById).toHaveBeenCalledWith(
      'user-123',
    );

    expect(req.user).toEqual({
      userId: 'user-123',
      role: 'admin',
    });

    expect(next).toHaveBeenCalledWith();
  });
});