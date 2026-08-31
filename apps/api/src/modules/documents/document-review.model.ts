import { Schema, model, Types } from 'mongoose';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';

export interface DocumentReviewDocument {
  documentId: Types.ObjectId;
  requesterId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  status: ReviewStatus;
  comment?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentReviewSchema = new Schema<DocumentReviewDocument>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'CHANGES_REQUESTED'],
      default: 'PENDING',
      required: true,
      index: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

documentReviewSchema.index({ documentId: 1, createdAt: -1 });
documentReviewSchema.index({ reviewerId: 1, status: 1 });
documentReviewSchema.index(
  { documentId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } },
);

export const DocumentReview = model<DocumentReviewDocument>(
  'DocumentReview',
  documentReviewSchema,
);
