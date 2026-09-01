import { Schema, model, Types } from 'mongoose';

export interface ProjectApiSpecDocument {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  version: string;
  format: 'JSON' | 'YAML';
  openApiVersion: string;
  rawContent: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectApiSpecSchema = new Schema<ProjectApiSpecDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: String,
      required: true,
      trim: true,
    },
    format: {
      type: String,
      enum: ['JSON', 'YAML'],
      required: true,
    },
    openApiVersion: {
      type: String,
      required: true,
      trim: true,
    },
    rawContent: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Enforce strictly one ACTIVE specification per project
projectApiSpecSchema.index(
  { projectId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

export const ProjectApiSpec = model<ProjectApiSpecDocument>(
  'ProjectApiSpec',
  projectApiSpecSchema,
);
