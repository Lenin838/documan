import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';

export type WorkRequestSource =
  | 'MANUAL'
  | 'CHANGE_IMPACT'
  | 'BASELINE_DRIFT'
  | 'VERIFICATION'
  | 'EVIDENCE'
  | 'GOVERNANCE';

export type WorkRequestStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'RESOLVED'
  | 'SKIPPED';

export interface IWorkRequestOriginatingContext {
  verificationPlanId?: Types.ObjectId | undefined;
  verificationTaskId?: Types.ObjectId | undefined;
  baselineId?: Types.ObjectId | undefined;
  driftDimension?: 'VERSION_DRIFT' | 'DOCUMENT_DELETION_DRIFT' | 'RELATIONSHIP_DRIFT' | 'VERIFICATION_DRIFT' | undefined;
  evidenceSourceId?: string | undefined;
  assuranceCheckId?: string | undefined;
  impactSourceDocumentId?: Types.ObjectId | undefined;
  upstreamVersionNumber?: number | undefined;
  changeType?: string | undefined;
}

export interface IDocumentationWorkRequest extends MongooseDocument {
  projectId: Types.ObjectId;
  documentId: Types.ObjectId;
  originKey?: string | null | undefined;
  targetVersionNumber?: number | undefined;
  title: string;
  reason: string;
  source: WorkRequestSource;
  status: WorkRequestStatus;
  createdBy: Types.ObjectId;
  assigneeId?: Types.ObjectId | undefined;
  originatingContext?: IWorkRequestOriginatingContext | undefined;
  resolutionNotes?: string | undefined;
  resolvedAt?: Date | undefined;
  resolvedBy?: Types.ObjectId | undefined;
  skippedAt?: Date | undefined;
  skippedBy?: Types.ObjectId | undefined;
  skipReason?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const originatingContextSchema = new Schema<IWorkRequestOriginatingContext>(
  {
    verificationPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'VerificationPlan',
      default: null,
    },
    verificationTaskId: {
      type: Schema.Types.ObjectId,
      ref: 'VerificationTask',
      default: null,
    },
    baselineId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentationBaseline',
      default: null,
    },
    driftDimension: {
      type: String,
      enum: ['VERSION_DRIFT', 'DOCUMENT_DELETION_DRIFT', 'RELATIONSHIP_DRIFT', 'VERIFICATION_DRIFT'],
      default: null,
    },
    evidenceSourceId: {
      type: String,
      default: null,
    },
    assuranceCheckId: {
      type: String,
      default: null,
    },
    impactSourceDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    upstreamVersionNumber: {
      type: Number,
      default: null,
    },
    changeType: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

const documentationWorkRequestSchema = new Schema<IDocumentationWorkRequest>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    originKey: {
      type: String,
      default: null,
      trim: true,
    },
    targetVersionNumber: {
      type: Number,
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['MANUAL', 'CHANGE_IMPACT', 'BASELINE_DRIFT', 'VERIFICATION', 'EVIDENCE', 'GOVERNANCE'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW', 'RESOLVED', 'SKIPPED'],
      default: 'OPEN',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    originatingContext: {
      type: originatingContextSchema,
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: null,
      trim: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    skippedAt: {
      type: Date,
      default: null,
    },
    skippedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    skipReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
documentationWorkRequestSchema.index({ projectId: 1, status: 1, createdAt: -1 });
documentationWorkRequestSchema.index({ documentId: 1, status: 1 });
documentationWorkRequestSchema.index({ assigneeId: 1, status: 1 });

// Partial unique index for active automated requests
documentationWorkRequestSchema.index(
  { projectId: 1, originKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      originKey: { $exists: true, $type: 'string' },
      status: { $in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW'] },
    },
  },
);

export const DocumentationWorkRequest = model<IDocumentationWorkRequest>(
  'DocumentationWorkRequest',
  documentationWorkRequestSchema,
);
