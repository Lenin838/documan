import { z } from 'zod';

export const knowledgeSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .default(''),

  projectId: z
    .string()
    .trim()
    .optional(),

  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .optional(),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
});

export type KnowledgeSearchQueryInput = z.infer<typeof knowledgeSearchQuerySchema>;
