/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document, Types } from 'mongoose';

export enum PackageStatus {
  DRAFT = 'DRAFT',
  SIMULATED = 'SIMULATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  DISCARDED = 'DISCARDED',
}

export interface IDocumentChangePackage extends Document {
  packageNumber: string;
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  proposals: Types.ObjectId[];
  status: PackageStatus;
  createdBy: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewComment?: string;
  lastSimulatedAt?: Date;
  packageStateFingerprint?: string;
  lastSimulationStatus?: string;
  simulationResultCache?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const changePackageSchema = new Schema<IDocumentChangePackage>(
  {
    packageNumber: {
      type: String,
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    proposals: [
      {
        type: Schema.Types.ObjectId,
        ref: 'DocumentChangeProposal',
      },
    ],
    status: {
      type: String,
      enum: Object.values(PackageStatus),
      default: PackageStatus.DRAFT,
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewComment: {
      type: String,
      trim: true,
    },
    lastSimulatedAt: {
      type: Date,
    },
    packageStateFingerprint: {
      type: String,
    },
    lastSimulationStatus: {
      type: String,
    },
    simulationResultCache: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index on projectId + packageNumber (unique)
changePackageSchema.index({ projectId: 1, packageNumber: 1 }, { unique: true });
changePackageSchema.index({ proposals: 1 });

export const DocumentChangePackage = model<IDocumentChangePackage>(
  'DocumentChangePackage',
  changePackageSchema,
);
