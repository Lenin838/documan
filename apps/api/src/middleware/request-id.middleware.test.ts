import type { NextFunction, Request, Response } from 'express';

import { describe, expect, it, vi } from 'vitest';

import { requestIdMiddleware } from './request-id.middleware.js';

function createMockRequest(
  requestId?: string,
): Request {
  return {
    header: vi.fn((name: string) => {
      if (
        name.toLowerCase() === 'x-request-id'
      ) {
        return requestId;
      }

      return undefined;
    }),
  } as unknown as Request;
}

function createMockResponse() {
  return {
    setHeader: vi.fn(),
  } as unknown as Response & {
    setHeader: ReturnType<typeof vi.fn>;
  };
}

describe('requestIdMiddleware', () => {
  it('should use the existing x-request-id header', () => {
    const requestId = 'req_existing_123';

    const req = createMockRequest(requestId);
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe(requestId);

    expect(res.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      requestId,
    );

    expect(next).toHaveBeenCalledOnce();
  });

  it('should generate a request ID when x-request-id is missing', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toMatch(/^req_[A-Za-z0-9_-]{16}$/);

    expect(res.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      req.requestId,
    );

    expect(next).toHaveBeenCalledOnce();
  });

  it('should store the generated request ID on the request', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).toMatch(/^req_/);
  });

  it('should use the same request ID for the request and response', () => {
    const requestId = 'client-request-456';

    const req = createMockRequest(requestId);
    const res = createMockResponse();
    const next = vi.fn() as NextFunction;

    requestIdMiddleware(req, res, next);

    const responseHeaderCall =
      res.setHeader.mock.calls[0];

    expect(responseHeaderCall).toEqual([
      'x-request-id',
      req.requestId,
    ]);

    expect(req.requestId).toBe(requestId);
  });
});