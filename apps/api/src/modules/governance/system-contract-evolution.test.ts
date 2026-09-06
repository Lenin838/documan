import { describe, it, expect } from 'vitest';

import { calculateContractEvolutionDelta } from './system-contract-evolution.service.js';

describe('System Contract Evolution Intelligence Engine', () => {
  it('should export calculateContractEvolutionDelta function', () => {
    expect(typeof calculateContractEvolutionDelta).toBe('function');
  });

  it('should reject invalid object IDs gracefully', async () => {
    await expect(
      calculateContractEvolutionDelta(
        'invalid-user-id',
        'user',
        'invalid-proj-id',
        'invalid-doc-id',
        'base-1',
        'base-2',
      ),
    ).rejects.toThrow();
  });
});
