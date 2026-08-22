import { describe, expect, it } from 'vitest';

import { getHealthStatus } from './health.service.js';

describe('getHealthStatus', () => {
  it('should return a healthy status', () => {
    expect(getHealthStatus()).toEqual({
      status: 'ok',
      service: 'documan-api',
    });
  });

  it('should return the expected status value', () => {
    const result = getHealthStatus();

    expect(result.status).toBe('ok');
  });

  it('should return the expected service name', () => {
    const result = getHealthStatus();

    expect(result.service).toBe('documan-api');
  });
});