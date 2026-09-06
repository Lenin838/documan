import { apiClient } from '../../api/client';
import type { ITraceabilityAuditResponse } from './system-traceability-audit.types';

export async function getTraceabilityAudit(
  documentId: string,
  versionNumber?: number,
): Promise<{ data: ITraceabilityAuditResponse }> {
  const params: Record<string, unknown> = {};
  if (versionNumber !== undefined && versionNumber !== null) {
    params.versionNumber = versionNumber;
  }
  const response = await apiClient.get<{ data: ITraceabilityAuditResponse }>(
    `/documents/${documentId}/traceability-audit`,
    { params },
  );
  return response.data;
}
