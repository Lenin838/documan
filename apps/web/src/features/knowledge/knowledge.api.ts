import { apiClient } from '../../api/client';
import type {
  KnowledgeSearchParams,
  KnowledgeSearchResponse,
} from './knowledge.types';

export async function searchKnowledge(
  params: KnowledgeSearchParams = {},
): Promise<KnowledgeSearchResponse> {
  const queryParams = new URLSearchParams();

  if (params.q !== undefined) {
    queryParams.append('q', params.q);
  }
  if (params.projectId) {
    queryParams.append('projectId', params.projectId);
  }
  if (params.page !== undefined) {
    queryParams.append('page', String(params.page));
  }
  if (params.limit !== undefined) {
    queryParams.append('limit', String(params.limit));
  }

  const response = await apiClient.get<KnowledgeSearchResponse>(
    `/knowledge/search?${queryParams.toString()}`,
  );

  return response.data;
}
