import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';
import { DocumentRelationshipType } from '../documents/document-relationship.model.js';

export interface IDocumentSnapshot {
  documentId: Types.ObjectId;
  documentVersionId?: Types.ObjectId | undefined;
  versionNumber: number;
  checksum: string;
}

export interface IRelationshipSnapshot {
  sourceDocumentId: Types.ObjectId;
  targetDocumentId: Types.ObjectId;
  type: DocumentRelationshipType;
}

export interface IDocumentationBaseline extends MongooseDocument {
  projectId: Types.ObjectId;
  name: string;
  versionTag: string;
  description?: string | undefined;
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: Date | undefined;
  archivedBy?: Types.ObjectId | undefined;
  createdBy: Types.ObjectId;
  documentSnapshots: IDocumentSnapshot[];
  relationshipSnapshots: IRelationshipSnapshot[];
  createdAt: Date;
  updatedAt: Date;
}

const documentSnapshotSchema = new Schema<IDocumentSnapshot>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    documentVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentVersion',
      default: null,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    checksum: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const relationshipSnapshotSchema = new Schema<IRelationshipSnapshot>(
  {
    sourceDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    targetDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    type: {
      type: String,
      enum: ['RELATED', 'REFERENCES', 'REPLACES', 'DEPENDS_ON'],
      required: true,
    },
  },
  { _id: false },
);

const documentationBaselineSchema = new Schema<IDocumentationBaseline>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    versionTag: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isArchived: {
      type: Boolean,
      required: true,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    documentSnapshots: {
      type: [documentSnapshotSchema],
      default: [],
    },
    relationshipSnapshots: {
      type: [relationshipSnapshotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
documentationBaselineSchema.index({ projectId: 1, createdAt: -1 });
documentationBaselineSchema.index({ projectId: 1, versionTag: 1 }, { unique: true });
documentationBaselineSchema.index(
  { projectId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

export const DocumentationBaseline = model<IDocumentationBaseline>(
  'DocumentationBaseline',
  documentationBaselineSchema,
);
