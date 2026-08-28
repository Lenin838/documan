import { apiClient } from '../../api/client';
import type {
  CreateShareParams,
  GetSharesResponse,
  RevokeShareResponse,
  ShareResponse,
  UpdateShareParams,
} from './document-share.types';

export async function getDocumentShares(
  documentId: string,
): Promise<GetSharesResponse> {
  const response = await apiClient.get<GetSharesResponse>(
    `/documents/${documentId}/shares`,
  );
  return response.data;
}

export async function createDocumentShare(
  documentId: string,
  params: CreateShareParams,
): Promise<ShareResponse> {
  const response = await apiClient.post<ShareResponse>(
    `/documents/${documentId}/shares`,
    params,
  );
  return response.data;
}

export async function updateDocumentShare(
  documentId: string,
  shareId: string,
  params: UpdateShareParams,
): Promise<ShareResponse> {
  const response = await apiClient.patch<ShareResponse>(
    `/documents/${documentId}/shares/${shareId}`,
    params,
  );
  return response.data;
}

export async function revokeDocumentShare(
  documentId: string,
  shareId: string,
): Promise<RevokeShareResponse> {
  const response = await apiClient.delete<RevokeShareResponse>(
    `/documents/${documentId}/shares/${shareId}`,
  );
  return response.data;
}
