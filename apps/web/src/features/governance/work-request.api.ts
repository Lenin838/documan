import { apiClient } from '../../api/client';
import type {
  IDocumentationWorkRequest,
  WorkRequestsPagination,
  CreateWorkRequestPayload,
  WorkRequestStatus,
  WorkRequestSource,
} from './work-request.types';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: WorkRequestsPagination;
}

export async function createWorkRequestApi(
  projectId: string,
  documentId: string,
  payload: CreateWorkRequestPayload,
): Promise<IDocumentationWorkRequest> {
  const res = await apiClient.post<ApiResponse<IDocumentationWorkRequest>>(
    `/projects/${projectId}/documents/${documentId}/work-requests`,
    payload,
  );
  return res.data.data;
}

export async function getProjectWorkRequestsApi(
  projectId: string,
  params?: { status?: WorkRequestStatus; source?: WorkRequestSource; assigneeId?: string; page?: number; limit?: number },
): Promise<{ requests: IDocumentationWorkRequest[]; pagination?: WorkRequestsPagination }> {
  const res = await apiClient.get<ApiResponse<{ requests: IDocumentationWorkRequest[]; pagination?: WorkRequestsPagination }>>(
    `/projects/${projectId}/work-requests`,
    { params },
  );
  return res.data.data;
}

export async function getDocumentWorkRequestsApi(
  documentId: string,
  params?: { status?: WorkRequestStatus; page?: number; limit?: number },
): Promise<{ requests: IDocumentationWorkRequest[]; pagination?: WorkRequestsPagination }> {
  const res = await apiClient.get<ApiResponse<{ requests: IDocumentationWorkRequest[]; pagination?: WorkRequestsPagination }>>(
    `/documents/${documentId}/work-requests`,
    { params },
  );
  return res.data.data;
}

export async function getWorkRequestDetailApi(requestId: string): Promise<IDocumentationWorkRequest> {
  const res = await apiClient.get<ApiResponse<IDocumentationWorkRequest>>(`/work-requests/${requestId}`);
  return res.data.data;
}

export async function assignWorkRequestApi(requestId: string, assigneeId: string): Promise<IDocumentationWorkRequest> {
  const res = await apiClient.post<ApiResponse<IDocumentationWorkRequest>>(`/work-requests/${requestId}/assign`, { assigneeId });
  return res.data.data;
}

export async function updateWorkRequestStatusApi(
  requestId: string,
  status: 'IN_PROGRESS' | 'IN_REVIEW',
): Promise<IDocumentationWorkRequest> {
  const res = await apiClient.patch<ApiResponse<IDocumentationWorkRequest>>(`/work-requests/${requestId}/status`, { status });
  return res.data.data;
}

export async function resolveWorkRequestApi(requestId: string, resolutionNotes?: string): Promise<IDocumentationWorkRequest> {
  const res = await apiClient.post<ApiResponse<IDocumentationWorkRequest>>(`/work-requests/${requestId}/resolve`, { resolutionNotes });
  return res.data.data;
}

export async function skipWorkRequestApi(requestId: string, skipReason: string): Promise<IDocumentationWorkRequest> {
  const res = await apiClient.post<ApiResponse<IDocumentationWorkRequest>>(`/work-requests/${requestId}/skip`, { skipReason });
  return res.data.data;
}

export async function reopenWorkRequestApi(requestId: string): Promise<IDocumentationWorkRequest> {
  const res = await apiClient.post<ApiResponse<IDocumentationWorkRequest>>(`/work-requests/${requestId}/reopen`);
  return res.data.data;
}
