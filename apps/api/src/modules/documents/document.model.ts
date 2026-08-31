import { Schema, model, Types } from 'mongoose';

export type DocumentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'DEPRECATED'
  | 'STALE';

export interface DocumentDocument {
  title: string;
  description?: string;
  folderId?: Types.ObjectId | null;
  projectId?: Types.ObjectId | null;
  tags?: string[];
  status: DocumentStatus;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  ownerId: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<DocumentDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },

    status: {
      type: String,
      enum: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'DEPRECATED', 'STALE'],
      default: 'DRAFT',
      required: true,
      index: true,
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

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Document = model<DocumentDocument>(
  'Document',
  documentSchema,
);