import { apiClient } from '../../api/client';
import type { DocumentAssuranceResult } from './assurance.types';

export interface AssuranceApiResponse {
  success: boolean;
  data: DocumentAssuranceResult;
}

export async function getDocumentAssurance(
  documentId: string,
): Promise<AssuranceApiResponse> {
  const response = await apiClient.get<AssuranceApiResponse>(
    `/documents/${documentId}/assurance`,
  );
  return response.data;
}

export async function evaluateDocumentAssurance(
  documentId: string,
): Promise<AssuranceApiResponse> {
  const response = await apiClient.post<AssuranceApiResponse>(
    `/documents/${documentId}/assurance/evaluate`,
  );
  return response.data;
}

export async function grantGovernanceWaiver(
  documentId: string,
  checkId: string,
  reason: string,
  expiresInDays?: number,
): Promise<AssuranceApiResponse> {
  const response = await apiClient.post<AssuranceApiResponse>(
    `/documents/${documentId}/assurance/waivers`,
    { checkId, reason, expiresInDays },
  );
  return response.data;
}

export async function revokeGovernanceWaiver(
  documentId: string,
  checkId: string,
): Promise<AssuranceApiResponse> {
  const response = await apiClient.delete<AssuranceApiResponse>(
    `/documents/${documentId}/assurance/waivers/${encodeURIComponent(checkId)}`,
  );
  return response.data;
}
