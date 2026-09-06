import { apiClient } from '../../api/client';
import type { SystemBaselineAlignmentResponse } from './system-baseline-alignment.types';

export async function getSystemBaselineAlignment(projectId: string): Promise<{
  data: SystemBaselineAlignmentResponse;
}> {
  const response = await apiClient.get<{
    data: SystemBaselineAlignmentResponse;
  }>(`/projects/${projectId}/system-baseline-alignment`);
  return response.data;
}
