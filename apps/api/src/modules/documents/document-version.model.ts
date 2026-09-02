import { Schema, model, Types } from 'mongoose';

export interface DocumentVersionDocument {
  documentId: Types.ObjectId;
  projectId?: Types.ObjectId | null;
  versionNumber: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  changeSummary?: string | null;
  createdById: Types.ObjectId;
  createdAt: Date;
}

const documentVersionSchema = new Schema<DocumentVersionDocument>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    changeSummary: {
      type: String,
      trim: true,
      default: null,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

documentVersionSchema.index({ documentId: 1, versionNumber: 1 }, { unique: true });
documentVersionSchema.index({ documentId: 1, createdAt: -1 });
documentVersionSchema.index({ projectId: 1, documentId: 1 });

export const DocumentVersion = model<DocumentVersionDocument>(
  'DocumentVersion',
  documentVersionSchema,
);
