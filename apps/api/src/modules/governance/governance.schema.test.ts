import { describe, it, expect } from 'vitest';
import { updateGovernanceSettingsSchema } from './governance.schema.js';

describe('Governance Schema Validation', () => {
  it('should accept valid governance settings input', () => {
    const res = updateGovernanceSettingsSchema.safeParse({
      isGovernanceEnabled: true,
      maxUnreviewedDays: 90,
      autoMarkStaleOnUpstreamChange: true,
    });
    expect(res.success).toBe(true);
  });

  it('should reject threshold less than 7 days', () => {
    const res = updateGovernanceSettingsSchema.safeParse({
      maxUnreviewedDays: 5,
    });
    expect(res.success).toBe(false);
  });

  it('should reject threshold greater than 365 days', () => {
    const res = updateGovernanceSettingsSchema.safeParse({
      maxUnreviewedDays: 400,
    });
    expect(res.success).toBe(false);
  });

  it('should allow partial update objects', () => {
    const res = updateGovernanceSettingsSchema.safeParse({
      maxUnreviewedDays: 30,
    });
    expect(res.success).toBe(true);
  });
});
