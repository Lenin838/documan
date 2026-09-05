/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, Document, Types } from 'mongoose';
import type { DocumentRelationshipType } from '../documents/document-relationship.model.js';

export enum ProposalType {
  DOCUMENT_CONTENT_UPDATE = 'DOCUMENT_CONTENT_UPDATE',
  TECHNICAL_CONTRACT_UPDATE = 'TECHNICAL_CONTRACT_UPDATE',
  RELATIONSHIP_UPDATE = 'RELATIONSHIP_UPDATE',
  DEPRECATION_PROPOSAL = 'DEPRECATION_PROPOSAL',
}

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  SIMULATED = 'SIMULATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  DISCARDED = 'DISCARDED',
}

export interface ProposedRelationshipOperation {
  operation: 'ADD_RELATIONSHIP' | 'REMOVE_RELATIONSHIP';
  targetDocumentId: Types.ObjectId;
  type: DocumentRelationshipType;
  description?: string;
}

export interface ProposedChangePayload {
  title?: string;
  content?: string;
  changeDescription?: string;
  contractSchema?: Record<string, any>;
  targetVersionType?: 'MAJOR' | 'MINOR' | 'PATCH';
  relationshipOperations?: ProposedRelationshipOperation[];
}

export interface IDocumentChangeProposal extends Document {
  proposalNumber: string;
  projectId: Types.ObjectId;
  targetDocumentId: Types.ObjectId;
  title: string;
  description?: string;
  proposalType: ProposalType;
  proposedChange: ProposedChangePayload;
  status: ProposalStatus;
  createdBy: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  reviewComment?: string;
  lastSimulatedAt?: Date;
  simulationStateFingerprint?: string;
  lastSimulationStatus?: string;
  simulationResultCache?: Record<string, any>;
  acceptedAuthoritativeVersionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const relationshipOperationSchema = new Schema<ProposedRelationshipOperation>(
  {
    operation: {
      type: String,
      enum: ['ADD_RELATIONSHIP', 'REMOVE_RELATIONSHIP'],
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
    description: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const proposedChangeSchema = new Schema<ProposedChangePayload>(
  {
    title: { type: String, trim: true },
    content: { type: String },
    changeDescription: { type: String, trim: true },
    contractSchema: { type: Schema.Types.Mixed },
    targetVersionType: { type: String, enum: ['MAJOR', 'MINOR', 'PATCH'] },
    relationshipOperations: [relationshipOperationSchema],
  },
  { _id: false },
);

const documentChangeProposalSchema = new Schema<IDocumentChangeProposal>(
  {
    proposalNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    targetDocumentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    proposalType: {
      type: String,
      enum: Object.values(ProposalType),
      required: true,
    },
    proposedChange: {
      type: proposedChangeSchema,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ProposalStatus),
      default: ProposalStatus.DRAFT,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewComment: {
      type: String,
      trim: true,
    },
    lastSimulatedAt: {
      type: Date,
    },
    simulationStateFingerprint: {
      type: String,
    },
    lastSimulationStatus: {
      type: String,
    },
    simulationResultCache: {
      type: Schema.Types.Mixed,
    },
    acceptedAuthoritativeVersionId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentVersion',
    },
  },
  {
    timestamps: true,
  },
);

export const DocumentChangeProposal = model<IDocumentChangeProposal>(
  'DocumentChangeProposal',
  documentChangeProposalSchema,
);
