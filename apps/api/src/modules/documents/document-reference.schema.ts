import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const safeUrlSchema = z
  .string()
  .trim()
  .min(1, 'URL is required')
  .max(2000, 'URL must not exceed 2000 characters')
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    {
      message: 'URL must be a valid HTTP or HTTPS URL',
    },
  );

export const technicalReferenceTypeSchema = z.enum([
  'API',
  'REPOSITORY',
  'SPECIFICATION',
  'ISSUE',
  'OTHER',
]);

export const createDocumentReferenceSchema = z.object({
  type: technicalReferenceTypeSchema,
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(150, 'Title must not exceed 150 characters'),
  url: safeUrlSchema,
});

export type CreateDocumentReferenceInput = z.infer<
  typeof createDocumentReferenceSchema
>;

export const updateDocumentReferenceSchema = z
  .object({
    type: technicalReferenceTypeSchema.optional(),
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(150, 'Title must not exceed 150 characters')
      .optional(),
    url: safeUrlSchema.optional(),
  })
  .refine(
    (data) =>
      data.type !== undefined ||
      data.title !== undefined ||
      data.url !== undefined,
    {
      message: 'At least one field (type, title, or url) must be provided for update',
    },
  );

export type UpdateDocumentReferenceInput = z.infer<
  typeof updateDocumentReferenceSchema
>;

export const documentReferenceParamsSchema = z.object({
  id: z.string().regex(OBJECT_ID_REGEX, 'Invalid document ID'),
  referenceId: z.string().regex(OBJECT_ID_REGEX, 'Invalid reference ID').optional(),
});

export type DocumentReferenceParamsInput = z.infer<
  typeof documentReferenceParamsSchema
>;
