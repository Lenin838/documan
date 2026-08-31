import { Schema, model, Types } from 'mongoose';

export interface ProjectDocument {
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  isArchived: boolean;
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
  },
  {
    timestamps: true,
  },
);

projectSchema.index({ ownerId: 1, isArchived: 1 });

export const Project = model<ProjectDocument>('Project', projectSchema);
