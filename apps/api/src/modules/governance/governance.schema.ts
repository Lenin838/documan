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
  releaseGateSettings: z
    .object({
      allowStale: z.boolean().optional(),
      allowPendingReviews: z.boolean().optional(),
      allowDeprecated: z.boolean().optional(),
      minFreshnessPercentage: z
        .number()
        .int()
        .min(0, { message: 'Min freshness percentage cannot be negative' })
        .max(100, { message: 'Min freshness percentage cannot exceed 100' })
        .optional(),
    })
    .optional(),
});

export const createGateTokenSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Token name is required' })
    .max(50, { message: 'Token name cannot exceed 50 characters' })
    .trim(),
  expiresInDays: z
    .number()
    .int()
    .min(1, { message: 'Expiration must be at least 1 day' })
    .max(365, { message: 'Expiration cannot exceed 365 days' })
    .optional(),
});

export const gateCheckMetadataSchema = z.object({
  buildId: z.string().max(100).optional(),
  commitHash: z.string().max(100).optional(),
  environment: z.string().max(100).optional(),
});

export type UpdateGovernanceSettingsInput = z.infer<
  typeof updateGovernanceSettingsSchema
>;

export type CreateGateTokenInput = z.infer<typeof createGateTokenSchema>;
export type GateCheckMetadataInput = z.infer<typeof gateCheckMetadataSchema>;
