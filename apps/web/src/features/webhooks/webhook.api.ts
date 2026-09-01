import axios from 'axios';
import type {
  Webhook,
  WebhookDelivery,
  CreateWebhookPayload,
  UpdateWebhookPayload,
} from './webhook.types';

const API_URL = '/api/v1';

export async function getProjectWebhooks(projectId: string) {
  return axios.get<{ success: boolean; data: { webhooks: Webhook[] } }>(
    `${API_URL}/projects/${projectId}/webhooks`,
  );
}

export async function createWebhook(projectId: string, payload: CreateWebhookPayload) {
  return axios.post<{ success: boolean; data: Webhook; message: string }>(
    `${API_URL}/projects/${projectId}/webhooks`,
    payload,
  );
}

export async function updateWebhook(projectId: string, webhookId: string, payload: UpdateWebhookPayload) {
  return axios.patch<{ success: boolean; data: { webhook: Webhook }; message: string }>(
    `${API_URL}/projects/${projectId}/webhooks/${webhookId}`,
    payload,
  );
}

export async function deleteWebhook(projectId: string, webhookId: string) {
  return axios.delete<{ success: boolean; message: string }>(
    `${API_URL}/projects/${projectId}/webhooks/${webhookId}`,
  );
}

export async function rotateWebhookSecret(projectId: string, webhookId: string) {
  return axios.post<{ success: boolean; data: Webhook; message: string }>(
    `${API_URL}/projects/${projectId}/webhooks/${webhookId}/rotate-secret`,
  );
}

export async function getWebhookDeliveries(projectId: string, webhookId: string, page = 1, limit = 20) {
  return axios.get<{
    success: boolean;
    data: {
      deliveries: WebhookDelivery[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  }>(`${API_URL}/projects/${projectId}/webhooks/${webhookId}/deliveries`, {
    params: { page, limit },
  });
}
