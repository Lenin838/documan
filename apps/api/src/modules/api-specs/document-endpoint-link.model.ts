import { Schema, model, Types } from 'mongoose';

export type EndpointLinkStatus = 'LINKED' | 'ORPHANED';

export interface DocumentEndpointLinkDocument {
  _id: Types.ObjectId;
  documentId: Types.ObjectId;
  endpointId: Types.ObjectId;
  projectId: Types.ObjectId;
  status: EndpointLinkStatus;
  orphanedReason?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentEndpointLinkSchema = new Schema<DocumentEndpointLinkDocument>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    endpointId: {
      type: Schema.Types.ObjectId,
      ref: 'ProjectApiEndpoint',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['LINKED', 'ORPHANED'],
      default: 'LINKED',
      index: true,
    },
    orphanedReason: {
      type: String,
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

documentEndpointLinkSchema.index({ documentId: 1, endpointId: 1 }, { unique: true });
documentEndpointLinkSchema.index({ projectId: 1, status: 1 });
documentEndpointLinkSchema.index({ endpointId: 1, status: 1 });

export const DocumentEndpointLink = model<DocumentEndpointLinkDocument>(
  'DocumentEndpointLink',
  documentEndpointLinkSchema,
);
