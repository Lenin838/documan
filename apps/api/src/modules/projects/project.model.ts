import { Schema, model, Types } from 'mongoose';

export interface ProjectGovernanceSettings {
  isGovernanceEnabled: boolean;
  maxUnreviewedDays: number;
  autoMarkStaleOnUpstreamChange: boolean;
}

export interface ProjectDocument {
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  isArchived: boolean;
  governanceSettings: ProjectGovernanceSettings;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  {
    timestamps: true,
  },
);

projectSchema.index({ ownerId: 1, isArchived: 1 });

export const Project = model<ProjectDocument>('Project', projectSchema);
