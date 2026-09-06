import { Schema, model, Types, Document } from 'mongoose';

export type SystemBlockerType =
  | 'CONTRACT_MISALIGNED'
  | 'PROVIDER_ATTESTATION_MISSING'
  | 'PROVIDER_ATTESTATION_STALE'
  | 'PROVIDER_LOCAL_GATE_BLOCKED'
  | 'PROVIDER_GOVERNANCE_DISABLED';

export type WaiverScopeState = 'ACTIVE' | 'REVOKED' | 'SUPERSEDED';

export interface ISystemGovernanceWaiver {
  rootProjectId: Types.ObjectId;
  targetProviderProjectId: Types.ObjectId;
  targetDocumentId?: Types.ObjectId | null;
  contractVersionNumber?: number | null;
  blockerType: SystemBlockerType;
  activeScopeKey: string;
  scopeState: WaiverScopeState;
  reason: string;
  grantedByUserId: Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date | null;
  revokedByUserId?: Types.ObjectId | null;
  revocationReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemGovernanceWaiverDocument extends ISystemGovernanceWaiver, Document {}

const systemGovernanceWaiverSchema = new Schema<SystemGovernanceWaiverDocument>(
  {
    rootProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    targetProviderProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    targetDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
      default: null,
      index: true,
    },
    contractVersionNumber: {
      type: Number,
      required: false,
      default: null,
    },
    blockerType: {
      type: String,
      enum: [
        'CONTRACT_MISALIGNED',
        'PROVIDER_ATTESTATION_MISSING',
        'PROVIDER_ATTESTATION_STALE',
        'PROVIDER_LOCAL_GATE_BLOCKED',
        'PROVIDER_GOVERNANCE_DISABLED',
      ],
      required: true,
    },
    activeScopeKey: {
      type: String,
      required: true,
    },
    scopeState: {
      type: String,
      enum: ['ACTIVE', 'REVOKED', 'SUPERSEDED'],
      required: true,
      default: 'ACTIVE',
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    grantedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      required: false,
      default: null,
    },
    revokedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    revocationReason: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

systemGovernanceWaiverSchema.index({
  rootProjectId: 1,
  isRevoked: 1,
  expiresAt: 1,
});

systemGovernanceWaiverSchema.index(
  { activeScopeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { scopeState: 'ACTIVE' },
  },
);

export const SystemGovernanceWaiver = model<SystemGovernanceWaiverDocument>(
  'SystemGovernanceWaiver',
  systemGovernanceWaiverSchema,
);

export function computeActiveScopeKey(
  rootProjectId: string,
  targetProviderProjectId: string,
  blockerType: SystemBlockerType,
  targetDocumentId?: string | null,
  contractVersionNumber?: number | null,
): string {
  const docPart = targetDocumentId ? targetDocumentId.toString() : 'ALL_DOCS';
  const verPart =
    contractVersionNumber !== null && contractVersionNumber !== undefined ? `v${contractVersionNumber}` : 'ANY_VER';
  return `${rootProjectId}:${targetProviderProjectId}:${docPart}:${verPart}:${blockerType}`;
}
