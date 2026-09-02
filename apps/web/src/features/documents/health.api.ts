import { apiClient } from '../../api/client';
import type {
  KnowledgeHealthData,
  ProjectKnowledgeRiskData,
} from './health.types';

export async function fetchDocumentHealth(
  documentId: string,
): Promise<KnowledgeHealthData> {
  const response = await apiClient.get<{ status: string; data: KnowledgeHealthData }>(
    `/documents/${documentId}/health`,
  );
  return response.data.data;
}

export async function updateDocumentSteward(
  documentId: string,
  stewardId: string | null,
): Promise<{ health: KnowledgeHealthData }> {
  const response = await apiClient.patch<{
    status: string;
    data: { health: KnowledgeHealthData };
  }>(`/documents/${documentId}/steward`, { stewardId });
  return response.data.data;
}

export async function fetchProjectKnowledgeRisk(
  projectId: string,
  page = 1,
  limit = 20,
): Promise<ProjectKnowledgeRiskData> {
  const response = await apiClient.get<{
    status: string;
    data: ProjectKnowledgeRiskData;
  }>(`/projects/${projectId}/knowledge-risk`, {
    params: { page, limit },
  });
  return response.data.data;
}
