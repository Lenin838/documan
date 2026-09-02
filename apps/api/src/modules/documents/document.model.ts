import { Schema, model, Types } from 'mongoose';

export type DocumentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'DEPRECATED'
  | 'STALE';

export interface ActiveImpactSource {
  upstreamDocumentId: Types.ObjectId;
  upstreamVersionNumber?: number;
  changeType: 'STALE' | 'DEPRECATED' | 'FILE_REPLACED';
  flaggedAt: Date;
}

export interface DocumentImpactVerification {
  needsVerification: boolean;
  activeImpactSources: ActiveImpactSource[];
  lastVerifiedAt?: Date | null;
  lastVerifiedBy?: Types.ObjectId | null;
  resolutionNote?: string | null;
}

export interface DocumentDocument {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  folderId?: Types.ObjectId | null;
  projectId?: Types.ObjectId | null;
  tags?: string[];
  status: DocumentStatus;
  version: number;
  lastApprovedVersion?: number | null;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  ownerId: Types.ObjectId;
  stewardId?: Types.ObjectId | null;
  isDeleted: boolean;
  lastReviewedAt?: Date | null;
  impactVerification?: DocumentImpactVerification;
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

    version: {
      type: Number,
      default: 1,
      required: true,
    },

    lastApprovedVersion: {
      type: Number,
      default: null,
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

    stewardId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastReviewedAt: {
      type: Date,
      default: null,
      index: true,
    },

    impactVerification: {
      needsVerification: {
        type: Boolean,
        default: false,
        index: true,
      },
      activeImpactSources: [
        {
          upstreamDocumentId: {
            type: Schema.Types.ObjectId,
            ref: 'Document',
            required: true,
          },
          upstreamVersionNumber: {
            type: Number,
            default: null,
          },
          changeType: {
            type: String,
            enum: ['STALE', 'DEPRECATED', 'FILE_REPLACED'],
            required: true,
          },
          flaggedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      lastVerifiedAt: {
        type: Date,
        default: null,
      },
      lastVerifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      resolutionNote: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

documentSchema.index({ projectId: 1, status: 1, lastReviewedAt: 1 });
documentSchema.index({ projectId: 1, 'impactVerification.needsVerification': 1 });

export const Document = model<DocumentDocument>(
  'Document',
  documentSchema,
);