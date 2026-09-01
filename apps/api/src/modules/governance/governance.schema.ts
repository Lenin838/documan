import { z } from 'zod';

export const updateGovernanceSettingsSchema = z.object({
  isGovernanceEnabled: z.boolean().optional(),
  maxUnreviewedDays: z
    .number()
    .int({ message: 'Max unreviewed days must be an integer' })
    .min(7, { message: 'Max unreviewed days must be at least 7 days' })
    .max(365, { message: 'Max unreviewed days cannot exceed 365 days' })
    .optional(),
  autoMarkStaleOnUpstreamChange: z.boolean().optional(),
});

export type UpdateGovernanceSettingsInput = z.infer<
  typeof updateGovernanceSettingsSchema
>;
