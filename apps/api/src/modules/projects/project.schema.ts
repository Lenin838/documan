import { z } from 'zod';

export const createProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters'),

    description: z
      .string()
      .trim()
      .max(500, 'Description must not exceed 500 characters')
      .optional(),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters')
      .optional(),

    description: z
      .string()
      .trim()
      .max(500, 'Description must not exceed 500 characters')
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID'),
});

export type ProjectParamsInput = z.infer<typeof projectParamsSchema>;

export const assignProjectDocumentSchema = z
  .object({
    documentId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid document ID'),
  })
  .strict();

export type AssignProjectDocumentInput = z.infer<
  typeof assignProjectDocumentSchema
>;

export const projectDocumentParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID'),

  documentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid document ID'),
});

export type ProjectDocumentParamsInput = z.infer<
  typeof projectDocumentParamsSchema
>;
