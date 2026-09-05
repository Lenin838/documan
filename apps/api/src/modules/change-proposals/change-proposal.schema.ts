import { z } from 'zod';

const isValidObjectId = (val: string) => /^[0-9a-fA-F]{24}$/.test(val);

export const proposalTypeSchema = z.enum([
  'DOCUMENT_CONTENT_UPDATE',
  'TECHNICAL_CONTRACT_UPDATE',
  'RELATIONSHIP_UPDATE',
  'DEPRECATION_PROPOSAL',
]);

export const proposalStatusSchema = z.enum([
  'DRAFT',
  'SIMULATED',
  'UNDER_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'DISCARDED',
]);

export const relationshipTypeSchema = z.enum([
  'RELATED',
  'REFERENCES',
  'REPLACES',
  'DEPENDS_ON',
]);

export const proposedRelationshipOperationSchema = z.object({
  operation: z.enum(['ADD_RELATIONSHIP', 'REMOVE_RELATIONSHIP']),
  targetDocumentId: z.string().refine(isValidObjectId, { message: 'Invalid target document ID' }),
  type: relationshipTypeSchema,
  description: z.string().trim().max(1000).optional(),
});

export const proposedChangeSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().optional(),
  changeDescription: z.string().trim().max(2000).optional(),
  contractSchema: z.record(z.string(), z.any()).optional(),
  targetVersionType: z.enum(['MAJOR', 'MINOR', 'PATCH']).optional(),
  relationshipOperations: z.array(proposedRelationshipOperationSchema).optional(),
});

export const createChangeProposalSchema = z.object({
  targetDocumentId: z.string().refine(isValidObjectId, { message: 'Invalid target document ID' }),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  proposalType: proposalTypeSchema,
  proposedChange: proposedChangeSchema,
});

export const simulateChangeSchema = z.object({
  proposalType: proposalTypeSchema,
  proposedChange: proposedChangeSchema,
});

export const updateProposalStatusSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'REJECTED', 'DISCARDED']),
  reviewComment: z.string().trim().max(1000).optional(),
});

export type CreateChangeProposalInput = z.infer<typeof createChangeProposalSchema>;
export type SimulateChangeInput = z.infer<typeof simulateChangeSchema>;
export type UpdateProposalStatusInput = z.infer<typeof updateProposalStatusSchema>;
