import { Schema, model, Types } from 'mongoose';

export type TechnicalReferenceType =
  | 'API'
  | 'REPOSITORY'
  | 'SPECIFICATION'
  | 'ISSUE'
  | 'OTHER';

export interface DocumentReferenceDocument {
  documentId: Types.ObjectId;
  type: TechnicalReferenceType;
  title: string;
  url: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentReferenceSchema = new Schema<DocumentReferenceDocument>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['API', 'REPOSITORY', 'SPECIFICATION', 'ISSUE', 'OTHER'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

documentReferenceSchema.index({ documentId: 1, createdAt: -1 });
documentReferenceSchema.index(
  { documentId: 1, type: 1, url: 1 },
  { unique: true },
);
documentReferenceSchema.index({ title: 1 });
documentReferenceSchema.index({ url: 1 });

export const DocumentReference = model<DocumentReferenceDocument>(
  'DocumentReference',
  documentReferenceSchema,
);
