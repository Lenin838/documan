import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSign } = vi.hoisted(() => ({
  mockSign: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: mockSign,
  },
}));

vi.mock('../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters-long',
    JWT_EXPIRES_IN: '15m',
  },
}));

import { generateAccessToken } from './jwt.js';

describe('generateAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate an access token', () => {
    mockSign.mockReturnValue('mock-access-token');

    const token = generateAccessToken('user-123');

    expect(token).toBe('mock-access-token');
  });

  it('should pass the correct userId in the payload', () => {
    mockSign.mockReturnValue('mock-access-token');

    generateAccessToken('user-123');

    expect(mockSign).toHaveBeenCalledWith(
      {
        userId: 'user-123',
      },
      'test-jwt-secret-that-is-at-least-32-characters-long',
      {
        expiresIn: '15m',
      },
    );
  });

  it('should use the JWT secret from environment configuration', () => {
    mockSign.mockReturnValue('mock-access-token');

    generateAccessToken('user-456');

    const secret = mockSign.mock.calls[0]?.[1];

    expect(secret).toBe(
      'test-jwt-secret-that-is-at-least-32-characters-long',
    );
  });

  it('should use the configured JWT expiration time', () => {
    mockSign.mockReturnValue('mock-access-token');

    generateAccessToken('user-789');

    const options = mockSign.mock.calls[0]?.[2];

    expect(options).toEqual({
      expiresIn: '15m',
    });
  });

  it('should return exactly the value returned by jwt.sign', () => {
    mockSign.mockReturnValue('signed-token');

    const result = generateAccessToken('user-123');

    expect(result).toBe('signed-token');
    expect(mockSign).toHaveBeenCalledTimes(1);
  });
});