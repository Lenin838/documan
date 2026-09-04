import { z } from 'zod';

export const UpdateTaskStatusSchema = z.object({
  status: z.enum(['IN_REVIEW', 'VERIFIED', 'SKIPPED']),
  skipReason: z.string().min(10, 'Skip reason must be at least 10 characters').optional(),
  evidenceReferenceId: z.string().optional(),
}).refine(
  (data) => {
    if (data.status === 'SKIPPED') {
      return !!data.skipReason && data.skipReason.trim().length >= 10;
    }
    return true;
  },
  {
    message: 'Skip reason of at least 10 characters is required when skipping a verification task',
    path: ['skipReason'],
  },
);

export const BypassPlanSchema = z.object({
  bypassReason: z.string().min(10, 'Bypass reason must be at least 10 characters'),
});

export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;
export type BypassPlanInput = z.infer<typeof BypassPlanSchema>;
