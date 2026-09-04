import { Schema, model, Types } from 'mongoose';

export type DocumentAuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'FILE_REPLACE'
  | 'VIEW'
  | 'DOWNLOAD'
  | 'DELETE'
  | 'RESTORE'
  | 'RELATIONSHIP_CREATE'
  | 'RELATIONSHIP_DELETE'
  | 'PROJECT_ASSIGN'
  | 'PROJECT_REMOVE'
  | 'TECHNICAL_REFERENCE_CREATE'
  | 'TECHNICAL_REFERENCE_UPDATE'
  | 'TECHNICAL_REFERENCE_DELETE'
  | 'REVIEW_REQUEST'
  | 'REVIEW_APPROVED'
  | 'REVIEW_CHANGES_REQUESTED'
  | 'STATUS_CHANGE'
  | 'DOCUMENT_IMPACT_FLAGGED'
  | 'DOCUMENT_IMPACT_VERIFIED'
  | 'DOCUMENT_VERSION_CREATED'
  | 'DOCUMENT_STEWARD_CHANGED'
  | 'GOVERNANCE_ASSURANCE_EVALUATED'
  | 'GOVERNANCE_WAIVER_GRANTED'
  | 'GOVERNANCE_WAIVER_REVOKED'
  | 'VERIFICATION_PLAN_CREATED'
  | 'VERIFICATION_TASK_COMPLETED'
  | 'VERIFICATION_TASK_SKIPPED'
  | 'VERIFICATION_PLAN_COMPLETED'
  | 'VERIFICATION_PLAN_BYPASSED'
  | 'VERIFICATION_PLAN_GENERATION_FAILED'
  | 'DOCUMENTATION_BASELINE_CREATED'
  | 'DOCUMENTATION_BASELINE_ARCHIVED'
  | 'WORK_REQUEST_CREATED'
  | 'WORK_REQUEST_ASSIGNED'
  | 'WORK_REQUEST_STATUS_CHANGED'
  | 'WORK_REQUEST_RESOLVED'
  | 'WORK_REQUEST_SKIPPED'
  | 'WORK_REQUEST_REOPENED';

export interface DocumentAuditDocument {
  documentId: Types.ObjectId;
  userId: Types.ObjectId;
  action: DocumentAuditAction;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const documentAuditSchema =
  new Schema<DocumentAuditDocument>(
    {
      documentId: {
        type: Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
        index: true,
      },

      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      action: {
        type: String,
        enum: [
          'CREATE',
          'UPDATE',
          'FILE_REPLACE',
          'VIEW',
          'DOWNLOAD',
          'DELETE',
          'RESTORE',
          'RELATIONSHIP_CREATE',
          'RELATIONSHIP_DELETE',
          'PROJECT_ASSIGN',
          'PROJECT_REMOVE',
          'TECHNICAL_REFERENCE_CREATE',
          'TECHNICAL_REFERENCE_UPDATE',
          'TECHNICAL_REFERENCE_DELETE',
          'REVIEW_REQUEST',
          'REVIEW_APPROVED',
          'REVIEW_CHANGES_REQUESTED',
          'STATUS_CHANGE',
          'DOCUMENT_IMPACT_FLAGGED',
          'DOCUMENT_IMPACT_VERIFIED',
          'DOCUMENT_VERSION_CREATED',
          'DOCUMENT_STEWARD_CHANGED',
          'GOVERNANCE_ASSURANCE_EVALUATED',
          'GOVERNANCE_WAIVER_GRANTED',
          'GOVERNANCE_WAIVER_REVOKED',
          'VERIFICATION_PLAN_CREATED',
          'VERIFICATION_TASK_COMPLETED',
          'VERIFICATION_TASK_SKIPPED',
          'VERIFICATION_PLAN_COMPLETED',
          'VERIFICATION_PLAN_BYPASSED',
          'VERIFICATION_PLAN_GENERATION_FAILED',
          'DOCUMENTATION_BASELINE_CREATED',
          'DOCUMENTATION_BASELINE_ARCHIVED',
          'WORK_REQUEST_CREATED',
          'WORK_REQUEST_ASSIGNED',
          'WORK_REQUEST_STATUS_CHANGED',
          'WORK_REQUEST_RESOLVED',
          'WORK_REQUEST_SKIPPED',
          'WORK_REQUEST_REOPENED',
        ],
        required: true,
      },

      metadata: {
        type: Schema.Types.Mixed,
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
    },
  );

documentAuditSchema.index({
  documentId: 1,
  createdAt: -1,
});

export const DocumentAudit =
  model<DocumentAuditDocument>(
    'DocumentAudit',
    documentAuditSchema,
  );