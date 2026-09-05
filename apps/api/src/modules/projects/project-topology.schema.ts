import { z } from 'zod';

const isValidObjectId = (val: string) => /^[0-9a-fA-F]{24}$/.test(val);

export const projectTopologyTypeSchema = z.enum([
  'DEPENDS_ON',
  'PROVIDES_API_TO',
  'INTEGRATES_WITH',
  'SHARED_LIBRARY',
]);

export const createProjectTopologyLinkSchema = z.object({
  targetProjectId: z
    .string()
    .refine(isValidObjectId, { message: 'Invalid target project ID' }),
  type: projectTopologyTypeSchema,
  description: z.string().trim().max(1000).optional().nullable(),
});

export const updateProjectTopologyLinkSchema = z.object({
  type: projectTopologyTypeSchema.optional(),
  description: z.string().trim().max(1000).optional().nullable(),
});

export const projectTopologyParamsSchema = z.object({
  projectId: z
    .string()
    .refine(isValidObjectId, { message: 'Invalid project ID' }),
});

export const projectTopologyIdParamsSchema = z.object({
  projectId: z
    .string()
    .refine(isValidObjectId, { message: 'Invalid project ID' }),
  linkId: z
    .string()
    .refine(isValidObjectId, { message: 'Invalid link ID' }),
});

export type CreateProjectTopologyLinkInput = z.infer<
  typeof createProjectTopologyLinkSchema
>;
export type UpdateProjectTopologyLinkInput = z.infer<
  typeof updateProjectTopologyLinkSchema
>;
