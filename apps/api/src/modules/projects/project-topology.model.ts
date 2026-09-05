import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';

export type ProjectTopologyType =
  | 'DEPENDS_ON'
  | 'PROVIDES_API_TO'
  | 'INTEGRATES_WITH'
  | 'SHARED_LIBRARY';

export interface IProjectTopologyLink extends MongooseDocument {
  sourceProjectId: Types.ObjectId;
  targetProjectId: Types.ObjectId;
  type: ProjectTopologyType;
  description?: string | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectTopologyLinkSchema = new Schema<IProjectTopologyLink>(
  {
    sourceProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    targetProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['DEPENDS_ON', 'PROVIDES_API_TO', 'INTEGRATES_WITH', 'SHARED_LIBRARY'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
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

// Compound unique index preventing duplicate directional links of the same type
projectTopologyLinkSchema.index(
  { sourceProjectId: 1, targetProjectId: 1, type: 1 },
  { unique: true },
);

projectTopologyLinkSchema.index({ targetProjectId: 1, type: 1 });

export const ProjectTopologyLink = model<IProjectTopologyLink>(
  'ProjectTopologyLink',
  projectTopologyLinkSchema,
);
