import { Schema, model, Types } from 'mongoose';

export interface ProjectGovernanceSettings {
  isGovernanceEnabled: boolean;
  maxUnreviewedDays: number;
  autoMarkStaleOnUpstreamChange: boolean;
}

export interface ProjectReleaseGateSettings {
  allowStale: boolean;
  allowPendingReviews: boolean;
  allowDeprecated: boolean;
  minFreshnessPercentage: number;
  allowOrphanedApiLinks?: boolean;
  allowDeprecatedApiEndpoints?: boolean;
  allowUnverifiedImpacts?: boolean;
}

export interface ProjectGateTokenSubdocument {
  _id: Types.ObjectId;
  name: string;
  tokenHash: string;
  tokenPrefix: string;
  createdBy: Types.ObjectId;
  expiresAt?: Date | null;
  lastUsedAt?: Date | null;
  revokedAt?: Date | null;
  createdAt: Date;
}

export interface ProjectDocument {
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  isArchived: boolean;
  governanceSettings: ProjectGovernanceSettings;
  releaseGateSettings: ProjectReleaseGateSettings;
  gateTokens: ProjectGateTokenSubdocument[];
  createdAt: Date;
  updatedAt: Date;
}

const gateTokenSubschema = new Schema<ProjectGateTokenSubdocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    tokenPrefix: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const projectSchema = new Schema<ProjectDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    governanceSettings: {
      isGovernanceEnabled: {
        type: Boolean,
        default: true,
      },
      maxUnreviewedDays: {
        type: Number,
        default: 90,
        min: 7,
        max: 365,
      },
      autoMarkStaleOnUpstreamChange: {
        type: Boolean,
        default: true,
      },
    },

    releaseGateSettings: {
      allowStale: {
        type: Boolean,
        default: false,
      },
      allowPendingReviews: {
        type: Boolean,
        default: false,
      },
      allowDeprecated: {
        type: Boolean,
        default: false,
      },
      minFreshnessPercentage: {
        type: Number,
        default: 80,
        min: 0,
        max: 100,
      },
      allowOrphanedApiLinks: {
        type: Boolean,
        default: false,
      },
      allowDeprecatedApiEndpoints: {
        type: Boolean,
        default: true,
      },
      allowUnverifiedImpacts: {
        type: Boolean,
        default: true,
      },
    },

    gateTokens: {
      type: [gateTokenSubschema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

projectSchema.index({ ownerId: 1, isArchived: 1 });
projectSchema.index({ 'gateTokens.tokenHash': 1 });

export const Project = model<ProjectDocument>('Project', projectSchema);
