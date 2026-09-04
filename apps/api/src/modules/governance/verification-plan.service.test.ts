import { describe, it, expect } from 'vitest';
import { UpdateTaskStatusSchema, BypassPlanSchema } from './verification-plan.schema.js';

describe('Verification Plan Schemas & Logic', () => {
  it('validates UpdateTaskStatusSchema for IN_REVIEW and VERIFIED', () => {
    const res1 = UpdateTaskStatusSchema.safeParse({ status: 'IN_REVIEW' });
    expect(res1.success).toBe(true);

    const res2 = UpdateTaskStatusSchema.safeParse({ status: 'VERIFIED' });
    expect(res2.success).toBe(true);
  });

  it('requires skipReason of at least 10 characters when status is SKIPPED', () => {
    const resShort = UpdateTaskStatusSchema.safeParse({ status: 'SKIPPED', skipReason: 'too short' });
    expect(resShort.success).toBe(false);

    const resValid = UpdateTaskStatusSchema.safeParse({
      status: 'SKIPPED',
      skipReason: 'Section is deprecated and replaced by external API link',
    });
    expect(resValid.success).toBe(true);
  });

  it('validates BypassPlanSchema with mandatory 10+ char reason', () => {
    const resShort = BypassPlanSchema.safeParse({ bypassReason: 'short' });
    expect(resShort.success).toBe(false);

    const resValid = BypassPlanSchema.safeParse({
      bypassReason: 'Emergency security release approved by project owner',
    });
    expect(resValid.success).toBe(true);
  });
});
