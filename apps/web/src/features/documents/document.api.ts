import { apiClient } from '../../api/client';

import type {
  GetDocumentResponse,
  GetDocumentsParams,
  GetDocumentsResponse,
} from './document.types';

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

export async function getDocumentById(
  documentId: string,
): Promise<GetDocumentResponse> {
  const response = await apiClient.get<GetDocumentResponse>(
    `/documents/${documentId}`,
  );

  return response.data;
}
