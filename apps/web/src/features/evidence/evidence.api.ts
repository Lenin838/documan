import { apiClient } from '../../api/client';
import type {
  EvidenceCoverageResponse,
  ReverseDocumentResponse,
  ReverseEndpointResponse,
  ReverseReferenceResponse,
} from './evidence.types';

export async function getDocumentEvidence(
  documentId: string,
): Promise<EvidenceCoverageResponse> {
  const response = await apiClient.get<EvidenceCoverageResponse>(
    `/documents/${documentId}/evidence`,
  );
  return response.data;
}

export async function getReverseEndpoint(
  endpointId: string,
): Promise<ReverseEndpointResponse> {
  const response = await apiClient.get<ReverseEndpointResponse>(
    `/evidence/reverse-endpoint?endpointId=${encodeURIComponent(endpointId)}`,
  );
  return response.data;
}

export async function getReverseDocument(
  targetDocumentId: string,
  relationshipType?: string,
): Promise<ReverseDocumentResponse> {
  const query = relationshipType
    ? `targetDocumentId=${encodeURIComponent(targetDocumentId)}&relationshipType=${encodeURIComponent(relationshipType)}`
    : `targetDocumentId=${encodeURIComponent(targetDocumentId)}`;

  const response = await apiClient.get<ReverseDocumentResponse>(
    `/evidence/reverse-document?${query}`,
  );
  return response.data;
}

export async function getReverseReference(
  url: string,
): Promise<ReverseReferenceResponse> {
  const response = await apiClient.get<ReverseReferenceResponse>(
    `/evidence/reverse-reference?url=${encodeURIComponent(url)}`,
  );
  return response.data;
}
