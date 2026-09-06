import { describe, it, expect } from 'vitest';
import { calculateSystemContractMatrix } from './system-contract-matrix.service.js';

describe('System Contract Matrix Service', () => {
  it('should be defined and export calculateSystemContractMatrix function', () => {
    expect(calculateSystemContractMatrix).toBeDefined();
    expect(typeof calculateSystemContractMatrix).toBe('function');
  });

  it('should validate root project ID format', async () => {
    await expect(
      calculateSystemContractMatrix('user123', 'user', 'invalid-project-id'),
    ).rejects.toThrow('Invalid root project ID');
  });
});
