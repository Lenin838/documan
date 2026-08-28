import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createDocumentShareSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Invalid user email')
      .toLowerCase(),

    permission: z.enum(['READ', 'EDIT']),
  })
  .strict();

export type CreateDocumentShareInput = z.infer<
  typeof createDocumentShareSchema
>;

export const updateDocumentShareSchema = z
  .object({
    permission: z.enum(['READ', 'EDIT']),
  })
  .strict();

export type UpdateDocumentShareInput = z.infer<
  typeof updateDocumentShareSchema
>;

export const documentShareParamsSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid document ID'),
});

export const documentShareIdParamsSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid document ID'),
  shareId: z.string().regex(objectIdRegex, 'Invalid share ID'),
});
