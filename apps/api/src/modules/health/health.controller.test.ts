import type { Request, Response } from 'express';

import { describe, expect, it, vi } from 'vitest';

import { healthController } from './health.controller.js';

const { mockGetHealthStatus, mockSendSuccess } =
  vi.hoisted(() => ({
    mockGetHealthStatus: vi.fn(),
    mockSendSuccess: vi.fn(),
  }));

vi.mock('./health.service.js', () => ({
  getHealthStatus: mockGetHealthStatus,
}));

vi.mock('../../utils/api-response.js', () => ({
  sendSuccess: mockSendSuccess,
}));

describe('healthController', () => {
  it('should get the health status and send a success response', () => {
    const healthStatus = {
      status: 'ok',
      service: 'documan-api',
    };

    mockGetHealthStatus.mockReturnValue(
      healthStatus,
    );

    const req = {} as Request;
    const res = {} as Response;

    healthController(req, res);

    expect(mockGetHealthStatus).toHaveBeenCalledOnce();

    expect(mockSendSuccess).toHaveBeenCalledWith(
      res,
      healthStatus,
    );
  });

  it('should return the result of sendSuccess', () => {
    const response = {
      success: true,
      data: {
        status: 'ok',
        service: 'documan-api',
      },
    };

    mockGetHealthStatus.mockReturnValue(
      response.data,
    );

    mockSendSuccess.mockReturnValue(response);

    const req = {} as Request;
    const res = {} as Response;

    const result = healthController(req, res);

    expect(result).toBe(response);
  });
});