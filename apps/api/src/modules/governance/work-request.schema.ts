import { z } from 'zod';

export const CreateWorkRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  reason: z.string().min(1, 'Reason is required').max(2000, 'Reason is too long'),
  assigneeId: z.string().optional().nullable(),
  targetVersionNumber: z.number().optional().nullable(),
});

export const AssignWorkRequestSchema = z.object({
  assigneeId: z.string().min(1, 'Assignee ID is required'),
});

export const UpdateWorkRequestStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'IN_REVIEW']),
});

export const ResolveWorkRequestSchema = z.object({
  resolutionNotes: z.string().max(2000, 'Resolution notes are too long').optional().nullable(),
});

export const SkipWorkRequestSchema = z.object({
  skipReason: z.string().min(1, 'Skip reason is required').max(2000, 'Skip reason is too long'),
});

export type CreateWorkRequestInput = z.infer<typeof CreateWorkRequestSchema>;
export type AssignWorkRequestInput = z.infer<typeof AssignWorkRequestSchema>;
export type UpdateWorkRequestStatusInput = z.infer<typeof UpdateWorkRequestStatusSchema>;
export type ResolveWorkRequestInput = z.infer<typeof ResolveWorkRequestSchema>;
export type SkipWorkRequestInput = z.infer<typeof SkipWorkRequestSchema>;
