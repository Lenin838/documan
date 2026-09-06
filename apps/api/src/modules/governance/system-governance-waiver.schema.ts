import { z } from 'zod';

export const grantSystemGovernanceWaiverSchema = z.object({
  body: z.object({
    targetProviderProjectId: z.string().min(1, 'targetProviderProjectId is required'),
    targetDocumentId: z.string().optional().nullable(),
    contractVersionNumber: z.number().int().positive().optional().nullable(),
    blockerType: z.enum([
      'CONTRACT_MISALIGNED',
      'PROVIDER_ATTESTATION_MISSING',
      'PROVIDER_ATTESTATION_STALE',
      'PROVIDER_LOCAL_GATE_BLOCKED',
      'PROVIDER_GOVERNANCE_DISABLED',
    ]),
    reason: z.string().trim().min(1, 'Waiver reason is required').max(2000),
    expiresInDays: z.number().int().min(1).max(365).optional().default(30),
  }),
});

export const revokeSystemGovernanceWaiverSchema = z.object({
  body: z.object({
    reason: z.string().trim().optional(),
  }).optional(),
});
