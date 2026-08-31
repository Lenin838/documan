import { Schema, model, Types } from 'mongoose';

export type DocumentRelationshipType =
  | 'RELATED'
  | 'REFERENCES'
  | 'REPLACES'
  | 'DEPENDS_ON';

export interface DocumentRelationshipDocument {
  sourceDocumentId: Types.ObjectId;
  targetDocumentId: Types.ObjectId;
  type: DocumentRelationshipType;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentRelationshipSchema = new Schema<DocumentRelationshipDocument>(
  {
    sourceDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },

    targetDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['RELATED', 'REFERENCES', 'REPLACES', 'DEPENDS_ON'],
      required: true,
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

documentRelationshipSchema.index(
  { sourceDocumentId: 1, targetDocumentId: 1, type: 1 },
  { unique: true },
);

documentRelationshipSchema.index({ sourceDocumentId: 1, targetDocumentId: 1 });

export const DocumentRelationship = model<DocumentRelationshipDocument>(
  'DocumentRelationship',
  documentRelationshipSchema,
);
