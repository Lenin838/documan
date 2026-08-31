import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createDocumentRelationshipSchema = z
  .object({
    targetDocumentId: z
      .string()
      .regex(objectIdRegex, 'Invalid target document ID'),

    type: z.enum(['RELATED', 'REFERENCES', 'REPLACES', 'DEPENDS_ON'], {
      message: 'Invalid relationship type',
    }),
  })
  .strict();

export type CreateDocumentRelationshipInput = z.infer<
  typeof createDocumentRelationshipSchema
>;

export const documentRelationshipParamsSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid document ID'),
});

export type DocumentRelationshipParams = z.infer<
  typeof documentRelationshipParamsSchema
>;

export const documentRelationshipIdParamsSchema = z.object({
  id: z.string().regex(objectIdRegex, 'Invalid document ID'),
  relationshipId: z.string().regex(objectIdRegex, 'Invalid relationship ID'),
});

export type DocumentRelationshipIdParams = z.infer<
  typeof documentRelationshipIdParamsSchema
>;
