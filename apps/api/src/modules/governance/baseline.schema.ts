import { z } from 'zod';

export const CreateBaselineSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  versionTag: z.string().min(1, 'Version tag is required').max(50, 'Version tag must be at most 50 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
});

export type CreateBaselineInputSchema = z.infer<typeof CreateBaselineSchema>;
