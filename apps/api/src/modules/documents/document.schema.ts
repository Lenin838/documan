import { z } from 'zod';

const tagsSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return val.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return val;
  },
  z.array(z.string().trim().min(1).max(50)).max(20).optional(),
);

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

    folderId: z
      .string()
      .trim()
      .nullable()
      .optional(),

    tags: tagsSchema,
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

    folderId: z
      .string()
      .trim()
      .nullable()
      .optional(),

    tags: tagsSchema,
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

  isDeleted: z
    .preprocess(
      (val) => (val === 'true' ? true : val === 'false' ? false : val),
      z.boolean().optional(),
    ),

  folderId: z
    .string()
    .trim()
    .optional(),

  view: z
    .enum(['all', 'mine', 'shared'])
    .optional(),

  tag: z
    .union([z.string().trim(), z.array(z.string().trim())])
    .optional(),

  fileType: z
    .string()
    .trim()
    .optional(),
});

export type DocumentsQueryInput = z.infer<
  typeof documentsQuerySchema
>;

export const documentAuditHistoryQuerySchema = z.object({
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

  action: z
    .enum([
      'CREATE',
      'UPDATE',
      'FILE_REPLACE',
      'VIEW',
      'DOWNLOAD',
      'DELETE',
      'RESTORE',
      'RELATIONSHIP_CREATE',
      'RELATIONSHIP_DELETE',
    ])
    .optional(),
});

export type DocumentAuditHistoryQueryInput = z.infer<
  typeof documentAuditHistoryQuerySchema
>;