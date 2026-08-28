export interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  ownerId: string;
  isDeleted: boolean;
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

export type DocumentAuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'FILE_REPLACE'
  | 'VIEW'
  | 'DOWNLOAD'
  | 'DELETE'
  | 'RESTORE';

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
