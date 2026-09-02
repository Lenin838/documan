export type DocumentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'DEPRECATED'
  | 'STALE';

export interface ActiveImpactSource {
  upstreamDocumentId: string;
  upstreamVersionNumber?: number;
  changeType: 'STALE' | 'DEPRECATED' | 'FILE_REPLACED';
  flaggedAt: string;
}

export interface DocumentImpactVerification {
  needsVerification: boolean;
  activeImpactSources: ActiveImpactSource[];
  lastVerifiedAt?: string | null;
  lastVerifiedBy?: string | null;
  resolutionNote?: string | null;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  folderId?: string | null;
  projectId?: string | null;
  tags?: string[];
  status?: DocumentStatus;
  version?: number;
  lastApprovedVersion?: number | null;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  ownerId: string;
  isDeleted: boolean;
  impactVerification?: DocumentImpactVerification;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetDocumentsParams {
  page?: number;
  limit?: number;
  search?: string;
  isDeleted?: boolean;
  folderId?: string;
  projectId?: string;
  view?: 'all' | 'mine' | 'shared';
  tag?: string | string[];
  fileType?: string;
}

export interface GetDocumentsResponse {
  success: boolean;
  data: {
    documents: Document[];
    pagination: DocumentsPagination;
  };
}

export interface GetDocumentResponse {
  success: boolean;
  data: Document;
}

export interface DeleteDocumentResponse {
  success: boolean;
  data: {
    message: string;
  };
}

export interface RestoreDocumentResponse {
  success: boolean;
  data: {
    message: string;
  };
}

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
  | 'DOCUMENT_IMPACT_VERIFIED';

export interface DocumentAudit {
  id: string;
  documentId: string;
  userId: string;
  action: DocumentAuditAction;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetDocumentAuditHistoryParams {
  page?: number;
  limit?: number;
  action?: DocumentAuditAction;
}

export interface GetDocumentAuditHistoryResponse {
  success: boolean;
  data: {
    auditHistory: DocumentAudit[];
    pagination: AuditHistoryPagination;
  };
}

export interface UpdateDocumentParams {
  title?: string;
  description?: string;
  folderId?: string | null;
  projectId?: string | null;
  tags?: string[];
  file?: File;
}

export interface UpdateDocumentResponse {
  success: boolean;
  data: Document;
}

export interface CreateDocumentParams {
  title: string;
  description?: string;
  folderId?: string | null;
  projectId?: string | null;
  tags?: string[];
  templateId?: string;
  file: File;
}

export interface CreateDocumentResponse {
  success: boolean;
  data: Document;
}
