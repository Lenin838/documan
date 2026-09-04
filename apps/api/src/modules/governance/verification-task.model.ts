import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';

export type VerificationMethod =
  | 'EVIDENCE_RENEWAL'
  | 'API_ALIGNMENT'
  | 'TECHNICAL_REVIEW'
  | 'CONTENT_AUDIT';

export type VerificationTaskStatus = 'OPEN' | 'IN_REVIEW' | 'VERIFIED' | 'SKIPPED';

export interface IVerificationTask extends MongooseDocument {
  planId: Types.ObjectId;
  projectId: Types.ObjectId;
  targetDocumentId: Types.ObjectId;
  triggerDocumentId: Types.ObjectId;
  triggerVersion: string;
  relationshipType: string;
  impactPath: string[];
  impactExplanations: string[];
  verificationMethod: VerificationMethod;
  applicableMethods: VerificationMethod[];
  status: VerificationTaskStatus;
  assignedStewardId: Types.ObjectId;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  skipReason?: string;
  evidenceReferenceId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const verificationTaskSchema = new Schema<IVerificationTask>(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'VerificationPlan',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    targetDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    triggerDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    triggerVersion: {
      type: String,
      required: true,
    },
    relationshipType: {
      type: String,
      required: true,
    },
    impactPath: {
      type: [String],
      default: [],
    },
    impactExplanations: {
      type: [String],
      default: [],
    },
    verificationMethod: {
      type: String,
      enum: ['EVIDENCE_RENEWAL', 'API_ALIGNMENT', 'TECHNICAL_REVIEW', 'CONTENT_AUDIT'],
      required: true,
    },
    applicableMethods: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_REVIEW', 'VERIFIED', 'SKIPPED'],
      default: 'OPEN',
      index: true,
    },
    assignedStewardId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    skipReason: {
      type: String,
    },
    evidenceReferenceId: {
      type: Schema.Types.ObjectId,
      ref: 'EvidenceItem',
    },
  },
  {
    timestamps: true,
  },
);

verificationTaskSchema.index(
  { planId: 1, targetDocumentId: 1 },
  { unique: true },
);

verificationTaskSchema.index({ targetDocumentId: 1, status: 1 });

export const VerificationTask = model<IVerificationTask>('VerificationTask', verificationTaskSchema);
