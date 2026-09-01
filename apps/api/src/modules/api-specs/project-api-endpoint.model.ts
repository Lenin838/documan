import { Schema, model, Types } from 'mongoose';

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export interface ProjectApiEndpointDocument {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  specId: Types.ObjectId;
  method: HttpMethod;
  path: string;
  summary?: string;
  operationId?: string;
  tags: string[];
  isDeprecated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const projectApiEndpointSchema = new Schema<ProjectApiEndpointDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    specId: {
      type: Schema.Types.ObjectId,
      ref: 'ProjectApiSpec',
      required: true,
      index: true,
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      required: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    operationId: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    isDeprecated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

projectApiEndpointSchema.index({ projectId: 1, path: 1, method: 1 });

export const ProjectApiEndpoint = model<ProjectApiEndpointDocument>(
  'ProjectApiEndpoint',
  projectApiEndpointSchema,
);
