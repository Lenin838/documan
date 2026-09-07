import { Schema, model, Document, Types } from 'mongoose';
import { ISystemReleaseSnapshot } from './system-release-certificate.types.js';

export interface ILifecycleEventDoc {
  eventType: 'ISSUED' | 'REVOKED';
  performedByUserId: Types.ObjectId;
  timestamp: Date;
  reason?: string;
}

export interface ISystemReleaseCertificateDoc extends Document {
  rootProjectId: Types.ObjectId;
  releaseTag: string;
  certificateVersion: number;
  certificateStatus: 'ACTIVE' | 'REVOKED';
  systemReleaseStatus: 'PASSED' | 'PASSED_WITH_WAIVER';
  certificateHash: string;
  certifiedByUserId: Types.ObjectId;
  certifiedAt: Date;
  notes?: string;
  supersedesCertificateId?: Types.ObjectId;
  lifecycleEvents: ILifecycleEventDoc[];
  snapshot: ISystemReleaseSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const SystemReleaseCertificateSchema = new Schema<ISystemReleaseCertificateDoc>(
  {
    rootProjectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    releaseTag: { type: String, required: true, trim: true },
    certificateVersion: { type: Number, required: true, default: 1 },
    certificateStatus: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      required: true,
      index: true,
      default: 'ACTIVE',
    },
    systemReleaseStatus: {
      type: String,
      enum: ['PASSED', 'PASSED_WITH_WAIVER'],
      required: true,
    },
    certificateHash: { type: String, required: true },
    certifiedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    certifiedAt: { type: Date, default: Date.now, required: true },
    notes: { type: String, trim: true },
    supersedesCertificateId: { type: Schema.Types.ObjectId, ref: 'SystemReleaseCertificate' },
    lifecycleEvents: [
      {
        eventType: { type: String, enum: ['ISSUED', 'REVOKED'], required: true },
        performedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        timestamp: { type: Date, default: Date.now, required: true },
        reason: { type: String, trim: true },
      },
    ],
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

// Compound partial unique index enforcing max 1 ACTIVE certificate per releaseTag per project
SystemReleaseCertificateSchema.index(
  { rootProjectId: 1, releaseTag: 1 },
  { unique: true, partialFilterExpression: { certificateStatus: 'ACTIVE' } }
);

export const SystemReleaseCertificate = model<ISystemReleaseCertificateDoc>(
  'SystemReleaseCertificate',
  SystemReleaseCertificateSchema
);
