import axios from 'axios';
import type {
  ProjectApiSpecResponse,
  DocumentEndpointLinkInfo,
} from './api-spec.types';

const API_URL = '/api/v1';

export async function getProjectApiSpec(
  projectId: string,
): Promise<ProjectApiSpecResponse> {
  const res = await axios.get<{ success: boolean; data: ProjectApiSpecResponse }>(
    `${API_URL}/projects/${projectId}/api-specs`,
  );
  return res.data.data;
}

export async function importProjectApiSpec(
  projectId: string,
  rawContent: string,
): Promise<{ spec: { id: string; title: string; version: string }; endpointsCount: number }> {
  const res = await axios.post<{
    success: boolean;
    data: { spec: { id: string; title: string; version: string }; endpointsCount: number };
  }>(`${API_URL}/projects/${projectId}/api-specs`, { rawContent });
  return res.data.data;
}

export async function deleteProjectApiSpec(
  projectId: string,
  specId: string,
): Promise<{ id: string; title: string; deleted: boolean }> {
  const res = await axios.delete<{
    success: boolean;
    data: { id: string; title: string; deleted: boolean };
  }>(`${API_URL}/projects/${projectId}/api-specs/${specId}`);
  return res.data.data;
}

export async function getDocumentApiEndpoints(
  documentId: string,
): Promise<DocumentEndpointLinkInfo[]> {
  const res = await axios.get<{ success: boolean; data: DocumentEndpointLinkInfo[] }>(
    `${API_URL}/documents/${documentId}/api-endpoints`,
  );
  return res.data.data;
}

export async function linkDocumentApiEndpoint(
  documentId: string,
  endpointId: string,
): Promise<DocumentEndpointLinkInfo> {
  const res = await axios.post<{ success: boolean; data: DocumentEndpointLinkInfo }>(
    `${API_URL}/documents/${documentId}/api-endpoints`,
    { endpointId },
  );
  return res.data.data;
}

export async function unlinkDocumentApiEndpoint(
  documentId: string,
  endpointId: string,
): Promise<{ documentId: string; endpointId: string; unlinked: boolean }> {
  const res = await axios.delete<{
    success: boolean;
    data: { documentId: string; endpointId: string; unlinked: boolean };
  }>(`${API_URL}/documents/${documentId}/api-endpoints/${endpointId}`);
  return res.data.data;
}
