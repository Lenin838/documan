import { Schema, model, Document, Types } from 'mongoose';

export interface IPackageFulfillmentAttestation extends Document {
  changePackageId: Types.ObjectId;
  projectId: Types.ObjectId;
  attestationVersion: number;
  packageStateFingerprint: string;
  constituentProposals: Array<{
    proposalId: Types.ObjectId;
    proposalFingerprint: string;
  }>;
  verifiedVersionSnapshot: Array<{
    documentId: Types.ObjectId;
    proposalId: Types.ObjectId;
    documentVersionId: Types.ObjectId;
    versionNumber: number;
    checksum: string;
  }>;
  fulfillmentStatus: 'FULFILLED';
  hasScopeVariance: boolean;
  scopeVarianceDetails?: Array<{
    documentId: Types.ObjectId;
    varianceType: string;
    description: string;
  }>;
  acceptedScopeVariance: boolean;
  scopeReviewComment?: string;
  attestedBy: Types.ObjectId;
  attestedByRole: string;
  createdAt: Date;
}

const packageFulfillmentAttestationSchema = new Schema<IPackageFulfillmentAttestation>(
  {
    changePackageId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentChangePackage',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    attestationVersion: {
      type: Number,
      required: true,
    },
    packageStateFingerprint: {
      type: String,
      required: true,
    },
    constituentProposals: [
      {
        proposalId: { type: Schema.Types.ObjectId, ref: 'DocumentChangeProposal', required: true },
        proposalFingerprint: { type: String, required: true },
      },
    ],
    verifiedVersionSnapshot: [
      {
        documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
        proposalId: { type: Schema.Types.ObjectId, ref: 'DocumentChangeProposal', required: true },
        documentVersionId: { type: Schema.Types.ObjectId, ref: 'DocumentVersion', required: true },
        versionNumber: { type: Number, required: true },
        checksum: { type: String, required: true },
      },
    ],
    fulfillmentStatus: {
      type: String,
      enum: ['FULFILLED'],
      required: true,
    },
    hasScopeVariance: {
      type: Boolean,
      required: true,
      default: false,
    },
    scopeVarianceDetails: [
      {
        documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
        varianceType: { type: String },
        description: { type: String },
      },
    ],
    acceptedScopeVariance: {
      type: Boolean,
      required: true,
      default: false,
    },
    scopeReviewComment: {
      type: String,
      trim: true,
    },
    attestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attestedByRole: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

packageFulfillmentAttestationSchema.index(
  { changePackageId: 1, attestationVersion: 1 },
  { unique: true },
);

packageFulfillmentAttestationSchema.index({ changePackageId: 1, createdAt: -1 });

export const PackageFulfillmentAttestation = model<IPackageFulfillmentAttestation>(
  'PackageFulfillmentAttestation',
  packageFulfillmentAttestationSchema,
);
