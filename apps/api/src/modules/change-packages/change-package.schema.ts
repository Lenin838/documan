import { z } from 'zod';
import { PackageStatus } from './change-package.model.js';

export const createChangePackageSchema = z.object({
  title: z.string().min(3, 'Package title must be at least 3 characters').max(150),
  description: z.string().max(1000).optional(),
  proposalIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid proposal ID')).optional(),
});

export type CreateChangePackageInput = z.infer<typeof createChangePackageSchema>;

export const addProposalToPackageSchema = z.object({
  proposalId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid proposal ID'),
});

export type AddProposalToPackageInput = z.infer<typeof addProposalToPackageSchema>;

export const updatePackageStatusSchema = z.object({
  status: z.enum([
    PackageStatus.UNDER_REVIEW,
    PackageStatus.REJECTED,
    PackageStatus.DISCARDED,
  ] as [string, ...string[]]),
  reviewComment: z.string().max(1000).optional(),
});

export type UpdatePackageStatusInput = z.infer<typeof updatePackageStatusSchema>;
