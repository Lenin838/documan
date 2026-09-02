import { z } from 'zod';

export const listDocumentVersionsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const getDocumentVersionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
    versionId: z.string().min(1, 'Version ID is required'),
  }),
  query: z.object({
    download: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  }),
});

export const compareDocumentVersionsSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
  body: z.object({
    sourceVersionId: z.string().min(1, 'Source version ID is required'),
    targetVersionId: z.string().min(1, 'Target version ID is required'),
  }),
});

export type ListDocumentVersionsInput = z.infer<typeof listDocumentVersionsSchema>;
export type GetDocumentVersionInput = z.infer<typeof getDocumentVersionSchema>;
export type CompareDocumentVersionsInput = z.infer<typeof compareDocumentVersionsSchema>;
