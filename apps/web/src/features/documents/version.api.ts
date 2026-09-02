import { apiClient } from '../../api/client';
import type {
  DocumentVersion,
  DocumentVersionsResponse,
  VersionCompareResult,
} from './version.types';

export async function listDocumentVersionsApi(
  documentId: string,
  page = 1,
  limit = 20,
): Promise<DocumentVersionsResponse> {
  const response = await apiClient.get<{ data: DocumentVersionsResponse }>(
    `/documents/${documentId}/versions?page=${page}&limit=${limit}`,
  );
  return response.data.data;
}

export async function getDocumentVersionApi(
  documentId: string,
  versionId: string,
): Promise<DocumentVersion> {
  const response = await apiClient.get<{ data: DocumentVersion }>(
    `/documents/${documentId}/versions/${versionId}`,
  );
  return response.data.data;
}

export async function compareDocumentVersionsApi(
  documentId: string,
  sourceVersionId: string,
  targetVersionId: string,
): Promise<VersionCompareResult> {
  const response = await apiClient.post<{ data: VersionCompareResult }>(
    `/documents/${documentId}/versions/compare`,
    { sourceVersionId, targetVersionId },
  );
  return response.data.data;
}
