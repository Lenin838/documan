import { Schema, model, Types } from 'mongoose';

export type SharePermission = 'READ' | 'EDIT';

export interface DocumentShareDocument {
  documentId: Types.ObjectId;
  sharedWithUserId: Types.ObjectId;
  permission: SharePermission;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentShareSchema = new Schema<DocumentShareDocument>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },

    sharedWithUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    permission: {
      type: String,
      enum: ['READ', 'EDIT'],
      required: true,
      default: 'READ',
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

documentShareSchema.index(
  { documentId: 1, sharedWithUserId: 1 },
  { unique: true },
);

export const DocumentShare = model<DocumentShareDocument>(
  'DocumentShare',
  documentShareSchema,
);
