import { z } from 'zod';

export const createDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(200, 'Title must not exceed 200 characters'),

    description: z
      .string()
      .trim()
      .max(1000, 'Description must not exceed 1000 characters')
      .optional(),
  })
  .strict();

export type CreateDocumentInput = z.infer<
  typeof createDocumentSchema
>;

export const updateDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(200, 'Title must not exceed 200 characters')
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000, 'Description must not exceed 1000 characters')
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field must be provided',
    },
  );

export type UpdateDocumentInput = z.infer<
  typeof updateDocumentSchema
>;

export const documentIdParamsSchema = z.object({
  id: z
    .string()
    .regex(
      /^[0-9a-fA-F]{24}$/,
      'Invalid document ID',
    ),
});

export type DocumentIdParams = z.infer<
  typeof documentIdParamsSchema
>;

export const documentsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10),

  search: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
});

export type DocumentsQueryInput = z.infer<
  typeof documentsQuerySchema
>;