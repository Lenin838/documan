import { describe, expect, it } from 'vitest';

import {
  getHealthStatus,
  getReadinessStatus,
  getLivenessStatus,
} from './health.service.js';

describe('health.service', () => {
  it('should return a healthy status structure', () => {
    const status = getHealthStatus();
    expect(status.service).toBe('documan-api');
    expect(typeof status.timestamp).toBe('string');
    expect(typeof status.uptime).toBe('number');
  });

  it('should return readiness status', () => {
    const readiness = getReadinessStatus();
    expect(typeof readiness.ready).toBe('boolean');
  });

  it('should return liveness status', () => {
    const liveness = getLivenessStatus();
    expect(liveness).toEqual({ live: true });
  });
});
