import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const createDocumentReviewSchema = z.object({
  reviewerId: z
    .string()
    .regex(OBJECT_ID_REGEX, 'Invalid reviewer ID'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Comment must not exceed 1000 characters')
    .optional(),
});

export type CreateDocumentReviewInput = z.infer<
  typeof createDocumentReviewSchema
>;

export const resolveDocumentReviewSchema = z.object({
  comment: z
    .string()
    .trim()
    .max(1000, 'Comment must not exceed 1000 characters')
    .optional(),
});

export type ResolveDocumentReviewInput = z.infer<
  typeof resolveDocumentReviewSchema
>;

export const documentReviewParamsSchema = z.object({
  id: z.string().regex(OBJECT_ID_REGEX, 'Invalid document ID'),
  reviewId: z
    .string()
    .regex(OBJECT_ID_REGEX, 'Invalid review ID')
    .optional(),
});

export type DocumentReviewParamsInput = z.infer<
  typeof documentReviewParamsSchema
>;
