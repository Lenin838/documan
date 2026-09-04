import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';

export type VerificationPlanStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'COMPLETED_WITH_SKIPS'
  | 'BYPASSED';

export interface IVerificationPlan extends MongooseDocument {
  projectId: Types.ObjectId;
  triggerDocumentId: Types.ObjectId;
  triggerVersion: string;
  triggerChecksum: string;
  status: VerificationPlanStatus;
  totalTasks: number;
  completedTasks: number;
  skippedTasks: number;
  createdBy: Types.ObjectId;
  completedAt?: Date;
  bypassedAt?: Date;
  bypassReason?: string;
  bypassedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const verificationPlanSchema = new Schema<IVerificationPlan>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    triggerDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    triggerVersion: {
      type: String,
      required: true,
      trim: true,
    },
    triggerChecksum: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED_WITH_SKIPS', 'BYPASSED'],
      default: 'PENDING',
      index: true,
    },
    totalTasks: {
      type: Number,
      default: 0,
    },
    completedTasks: {
      type: Number,
      default: 0,
    },
    skippedTasks: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: {
      type: Date,
    },
    bypassedAt: {
      type: Date,
    },
    bypassReason: {
      type: String,
    },
    bypassedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

verificationPlanSchema.index(
  { projectId: 1, triggerDocumentId: 1, triggerVersion: 1 },
  { unique: true },
);

export const VerificationPlan = model<IVerificationPlan>('VerificationPlan', verificationPlanSchema);
