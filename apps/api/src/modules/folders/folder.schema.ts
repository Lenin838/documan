import { z } from 'zod';

export const createFolderSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Folder name is required')
      .max(100, 'Folder name must not exceed 100 characters'),
  })
  .strict();

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Folder name is required')
      .max(100, 'Folder name must not exceed 100 characters'),
  })
  .strict();

export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

export const folderIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid folder ID'),
});

export type FolderIdParams = z.infer<typeof folderIdParamsSchema>;
