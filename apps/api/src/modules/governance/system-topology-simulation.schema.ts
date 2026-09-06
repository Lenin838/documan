import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const systemBlockerTypes = [
  'CONTRACT_MISALIGNED',
  'PROVIDER_ATTESTATION_MISSING',
  'PROVIDER_ATTESTATION_STALE',
  'PROVIDER_LOCAL_GATE_BLOCKED',
  'PROVIDER_GOVERNANCE_DISABLED',
] as const;

export const simulateSystemGateSchema = z.object({
  body: z.object({
    rootProjectId: z.string().regex(objectIdRegex, 'Invalid root project ID'),
    proposedBaselines: z
      .array(
        z.object({
          providerProjectId: z.string().regex(objectIdRegex, 'Invalid provider project ID'),
          targetDocumentId: z.string().regex(objectIdRegex, 'Invalid target document ID'),
          versionNumber: z.number().int().positive('Version number must be positive'),
        }),
      )
      .optional(),
    proposedAttestations: z
      .array(
        z.object({
          providerProjectId: z.string().regex(objectIdRegex, 'Invalid provider project ID'),
          changePackageId: z.string().regex(objectIdRegex, 'Invalid change package ID').optional(),
          attestationVersion: z.number().int().positive('Attestation version must be positive'),
        }),
      )
      .optional(),
    candidateWaivers: z
      .array(
        z.object({
          targetProviderProjectId: z.string().regex(objectIdRegex, 'Invalid provider project ID'),
          targetDocumentId: z.string().regex(objectIdRegex, 'Invalid target document ID').nullable().optional(),
          contractVersionNumber: z.number().int().positive().nullable().optional(),
          blockerType: z.enum(systemBlockerTypes),
          reason: z.string().min(1, 'Waiver reason is required').max(2000),
          expiresInDays: z.number().int().min(1).max(365).optional(),
        }),
      )
      .optional(),
    proposedTopologyLinks: z
      .array(
        z.object({
          targetProjectId: z.string().regex(objectIdRegex, 'Invalid target project ID'),
          dependencyType: z.enum(['DEPENDS_ON', 'REFERENCES']),
          action: z.enum(['ADD', 'REMOVE']),
        }),
      )
      .optional(),
  }),
});
