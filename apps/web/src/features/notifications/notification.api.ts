import { apiClient } from '../../api/client';
import type {
  GetNotificationsResponse,
  MarkReadResponse,
  MarkAllReadResponse,
} from './notification.types';

export async function getNotifications(
  page = 1,
  limit = 20,
): Promise<{ success: boolean; data: GetNotificationsResponse }> {
  const response = await apiClient.get<{
    success: boolean;
    data: GetNotificationsResponse;
  }>('/notifications', {
    params: { page, limit },
  });
  return response.data;
}

export async function markNotificationAsRead(
  id: string,
): Promise<{ success: boolean; data: MarkReadResponse }> {
  const response = await apiClient.patch<{
    success: boolean;
    data: MarkReadResponse;
  }>(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  data: MarkAllReadResponse;
}> {
  const response = await apiClient.post<{
    success: boolean;
    data: MarkAllReadResponse;
  }>('/notifications/mark-all-read');
  return response.data;
}
