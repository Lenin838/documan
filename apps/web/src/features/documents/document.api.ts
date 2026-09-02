import { apiClient } from '../../api/client';

import type {
  CreateDocumentParams,
  CreateDocumentResponse,
  DeleteDocumentResponse,
  GetDocumentAuditHistoryParams,
  GetDocumentAuditHistoryResponse,
  GetDocumentResponse,
  GetDocumentsParams,
  GetDocumentsResponse,
  RestoreDocumentResponse,
  UpdateDocumentParams,
  UpdateDocumentResponse,
} from './document.types';

export async function createDocument(
  params: CreateDocumentParams,
): Promise<CreateDocumentResponse> {
  const formData = new FormData();
  formData.append('title', params.title);

  if (params.description !== undefined) {
    formData.append('description', params.description);
  }

  if (params.folderId !== undefined && params.folderId !== null) {
    formData.append('folderId', params.folderId);
  }

  if (params.projectId !== undefined && params.projectId !== null) {
    formData.append('projectId', params.projectId);
  }

  if (params.tags !== undefined) {
    formData.append('tags', JSON.stringify(params.tags));
  }

  if (params.templateId !== undefined) {
    formData.append('templateId', params.templateId);
  }

  formData.append('file', params.file);

  const response = await apiClient.post<CreateDocumentResponse>(
    '/documents',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
}

export async function getDocuments(
  params: GetDocumentsParams = {},
): Promise<GetDocumentsResponse> {
  const response = await apiClient.get<GetDocumentsResponse>(
    '/documents',
    {
      params,
    },
  );

  return response.data;
}

export async function getDeletedDocuments(
  params: GetDocumentsParams = {},
): Promise<GetDocumentsResponse> {
  return getDocuments({
    ...params,
    isDeleted: true,
  });
}

export async function getDocumentById(
  documentId: string,
): Promise<GetDocumentResponse> {
  const response = await apiClient.get<GetDocumentResponse>(
    `/documents/${documentId}`,
  );

  return response.data;
}

export async function viewDocument(documentId: string) {
  const response = await apiClient.get<Blob>(
    `/documents/${documentId}/view`,
    {
      responseType: 'blob',
    },
  );

  return response;
}

export async function downloadDocument(documentId: string) {
  const response = await apiClient.get<Blob>(
    `/documents/${documentId}/download`,
    {
      responseType: 'blob',
    },
  );

  return response;
}

export async function getDocumentAuditHistory(
  documentId: string,
  params: GetDocumentAuditHistoryParams = {},
): Promise<GetDocumentAuditHistoryResponse> {
  const response = await apiClient.get<GetDocumentAuditHistoryResponse>(
    `/documents/${documentId}/audit-history`,
    {
      params,
    },
  );

  return response.data;
}

export async function updateDocument(
  documentId: string,
  params: UpdateDocumentParams,
): Promise<UpdateDocumentResponse> {
  const formData = new FormData();

  if (params.title !== undefined) {
    formData.append('title', params.title);
  }

  if (params.description !== undefined) {
    formData.append('description', params.description);
  }

  if (params.folderId !== undefined) {
    formData.append('folderId', params.folderId === null ? 'none' : params.folderId);
  }

  if (params.projectId !== undefined) {
    formData.append('projectId', params.projectId === null ? 'none' : params.projectId);
  }

  if (params.tags !== undefined) {
    formData.append('tags', JSON.stringify(params.tags));
  }

  if (params.file) {
    formData.append('file', params.file);
  }

  const response = await apiClient.patch<UpdateDocumentResponse>(
    `/documents/${documentId}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
}

export async function deleteDocument(
  documentId: string,
): Promise<DeleteDocumentResponse> {
  const response = await apiClient.delete<DeleteDocumentResponse>(
    `/documents/${documentId}`,
  );

  return response.data;
}

export async function restoreDocument(
  documentId: string,
): Promise<RestoreDocumentResponse> {
  const response = await apiClient.patch<RestoreDocumentResponse>(
    `/documents/${documentId}/restore`,
  );

  return response.data;
}

export async function updateDocumentStatus(
  documentId: string,
  params: { status: 'DRAFT' | 'STALE' | 'DEPRECATED'; reason?: string },
): Promise<UpdateDocumentResponse> {
  const response = await apiClient.patch<UpdateDocumentResponse>(
    `/documents/${documentId}/status`,
    params,
  );

  return response.data;
}

export async function verifyDocumentImpactApi(
  documentId: string,
  resolutionNote?: string,
): Promise<GetDocumentResponse> {
  const response = await apiClient.post<GetDocumentResponse>(
    `/documents/${documentId}/verify-impact`,
    { resolutionNote },
  );

  return response.data;
}
