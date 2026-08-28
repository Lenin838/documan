import { apiClient } from '../../api/client';

import type {
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
