export interface Webhook {
  id: string;
  projectId: string;
  url: string;
  description?: string;
  events: string[];
  isEnabled: boolean;
  consecutiveFailures: number;
  secretMasked: string;
  secretPlaintextOnce?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  projectId: string;
  eventId: string;
  eventType: string;
  attemptNumber: number;
  status: 'PENDING' | 'DELIVERING' | 'SUCCESS' | 'FAILED';
  httpStatus?: number;
  requestDurationMs?: number;
  errorMessage?: string;
  attemptedAt: string;
  createdAt: string;
}

export interface CreateWebhookPayload {
  url: string;
  description?: string;
  events?: string[];
}

export interface UpdateWebhookPayload {
  url?: string;
  description?: string;
  events?: string[];
  isEnabled?: boolean;
}
