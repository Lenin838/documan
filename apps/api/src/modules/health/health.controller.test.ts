import type { Request, Response } from 'express';

import { describe, expect, it, vi } from 'vitest';

import {
  healthController,
  readinessController,
  livenessController,
} from './health.controller.js';

const {
  mockGetHealthStatus,
  mockGetReadinessStatus,
  mockGetLivenessStatus,
  mockSendSuccess,
} = vi.hoisted(() => ({
  mockGetHealthStatus: vi.fn(),
  mockGetReadinessStatus: vi.fn(),
  mockGetLivenessStatus: vi.fn(),
  mockSendSuccess: vi.fn(),
}));

vi.mock('./health.service.js', () => ({
  getHealthStatus: mockGetHealthStatus,
  getReadinessStatus: mockGetReadinessStatus,
  getLivenessStatus: mockGetLivenessStatus,
}));

vi.mock('../../utils/api-response.js', () => ({
  sendSuccess: mockSendSuccess,
}));

describe('healthController', () => {
  it('should get health status and send success response when ok', () => {
    const healthStatus = { status: 'ok', service: 'documan-api' };
    mockGetHealthStatus.mockReturnValue(healthStatus);

    const req = {} as Request;
    const res = {} as Response;

    healthController(req, res);

    expect(mockGetHealthStatus).toHaveBeenCalledOnce();
    expect(mockSendSuccess).toHaveBeenCalledWith(res, healthStatus, 200);
  });

  it('should send liveness status', () => {
    const liveness = { live: true };
    mockGetLivenessStatus.mockReturnValue(liveness);

    const req = {} as Request;
    const res = {} as Response;

    livenessController(req, res);

    expect(mockSendSuccess).toHaveBeenCalledWith(res, liveness);
  });

  it('should return 200 for readiness when ready', () => {
    const readiness = { ready: true, database: 'connected' };
    mockGetReadinessStatus.mockReturnValue(readiness);

    const req = {} as Request;
    const statusFn = vi.fn().mockReturnThis();
    const jsonFn = vi.fn();
    const res = { status: statusFn, json: jsonFn } as unknown as Response;

    readinessController(req, res);

    expect(statusFn).toHaveBeenCalledWith(200);
    expect(jsonFn).toHaveBeenCalledWith({ success: true, data: readiness });
  });
});
