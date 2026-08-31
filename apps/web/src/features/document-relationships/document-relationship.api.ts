import { apiClient } from '../../api/client';
import type {
  CreateDocumentRelationshipParams,
  CreateDocumentRelationshipResponse,
  DeleteDocumentRelationshipResponse,
  GetDocumentRelationshipsResponse,
} from './document-relationship.types';

export async function getDocumentRelationships(
  documentId: string,
): Promise<GetDocumentRelationshipsResponse> {
  const response = await apiClient.get<GetDocumentRelationshipsResponse>(
    `/documents/${documentId}/relationships`,
  );
  return response.data;
}

export async function createDocumentRelationship(
  documentId: string,
  params: CreateDocumentRelationshipParams,
): Promise<CreateDocumentRelationshipResponse> {
  const response = await apiClient.post<CreateDocumentRelationshipResponse>(
    `/documents/${documentId}/relationships`,
    params,
  );
  return response.data;
}

export async function deleteDocumentRelationship(
  documentId: string,
  relationshipId: string,
): Promise<DeleteDocumentRelationshipResponse> {
  const response = await apiClient.delete<DeleteDocumentRelationshipResponse>(
    `/documents/${documentId}/relationships/${relationshipId}`,
  );
  return response.data;
}
