import { apiClient } from '../../api/client';
import type {
  DocumentReference,
  CreateDocumentReferenceInput,
  UpdateDocumentReferenceInput,
} from './document-reference.types';

export interface GetDocumentReferencesResponse {
  success: boolean;
  data: {
    references: DocumentReference[];
  };
}

export interface DocumentReferenceResponse {
  success: boolean;
  data: DocumentReference;
}

export interface DeleteDocumentReferenceResponse {
  success: boolean;
  data: {
    message: string;
  };
}

export async function getDocumentReferences(
  documentId: string,
): Promise<GetDocumentReferencesResponse> {
  const response = await apiClient.get<GetDocumentReferencesResponse>(
    `/documents/${documentId}/references`,
  );
  return response.data;
}

export async function createDocumentReference(
  documentId: string,
  input: CreateDocumentReferenceInput,
): Promise<DocumentReferenceResponse> {
  const response = await apiClient.post<DocumentReferenceResponse>(
    `/documents/${documentId}/references`,
    input,
  );
  return response.data;
}

export async function updateDocumentReference(
  documentId: string,
  referenceId: string,
  input: UpdateDocumentReferenceInput,
): Promise<DocumentReferenceResponse> {
  const response = await apiClient.patch<DocumentReferenceResponse>(
    `/documents/${documentId}/references/${referenceId}`,
    input,
  );
  return response.data;
}

export async function deleteDocumentReference(
  documentId: string,
  referenceId: string,
): Promise<DeleteDocumentReferenceResponse> {
  const response = await apiClient.delete<DeleteDocumentReferenceResponse>(
    `/documents/${documentId}/references/${referenceId}`,
  );
  return response.data;
}
