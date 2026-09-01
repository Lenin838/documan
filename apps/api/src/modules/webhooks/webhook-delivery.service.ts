import https from 'node:https';
import { Types } from 'mongoose';
import { nanoid } from 'nanoid';

import { Webhook } from './webhook.model.js';
import { WebhookDelivery } from './webhook-delivery.model.js';
import { createSsrfSafeHttpsAgent, validateWebhookUrl } from './ssrf-agent.js';
import { decryptSecret, computeHmacSignature } from './webhook-crypto.utils.js';
import { createNotificationInternal, safeNotify } from '../notifications/notification.service.js';

export interface WebhookEventPayload {
  eventId: string;
  eventType: string;
  timestamp: string;
  projectId: string;
  document?: {
    id: string;
    title: string;
  } | null;
  actor?: {
    id: string;
    name: string;
    email: string;
  } | null;
  data?: Record<string, unknown>;
}

// Global agent reused across requests
const ssrfAgent = createSsrfSafeHttpsAgent();

export async function dispatchWebhookEvent(params: {
  projectId: Types.ObjectId | string;
  eventType: string;
  document?: { id: string; title: string } | null;
  actor?: { id: string; name: string; email: string } | null;
  data?: Record<string, unknown>;
}): Promise<void> {
  const { projectId, eventType, document, actor, data } = params;

  if (!projectId) return;

  const projObjId = new Types.ObjectId(projectId.toString());

  // Find active webhooks for this project subscribed to this eventType or '*'
  const webhooks = await Webhook.find({
    projectId: projObjId,
    isEnabled: true,
    $or: [{ events: '*' }, { events: eventType }],
  });

  if (webhooks.length === 0) return;

  const eventId = `evt_${nanoid(21)}`;

  const payload: WebhookEventPayload = {
    eventId,
    eventType,
    timestamp: new Date().toISOString(),
    projectId: projObjId.toString(),
    ...(document !== undefined ? { document } : {}),
    ...(actor !== undefined ? { actor } : {}),
    ...(data !== undefined ? { data } : {}),
  };

  // Schedule pending delivery record for each webhook
  const deliveryDocs = webhooks.map((wh) => ({
    webhookId: wh._id,
    projectId: projObjId,
    eventId,
    eventType,
    attemptNumber: 1,
    status: 'PENDING' as const,
    nextAttemptAt: new Date(),
  }));

  await WebhookDelivery.insertMany(deliveryDocs);

  // Trigger immediate non-blocking delivery execution
  setImmediate(() => {
    void processPendingWebhookDeliveries(payload).catch((err) => {
      console.warn('Background webhook delivery processing error:', err);
    });
  });
}

export async function processSingleDeliveryAttempt(
  deliveryId: Types.ObjectId | string,
  payload: WebhookEventPayload,
): Promise<void> {
  const delivery = await WebhookDelivery.findOneAndUpdate(
    { _id: deliveryId, status: 'PENDING' },
    { status: 'DELIVERING', attemptedAt: new Date() },
    { new: true },
  );

  if (!delivery) return;

  const webhook = await Webhook.findById(delivery.webhookId);
  if (!webhook || !webhook.isEnabled) {
    delivery.status = 'FAILED';
    delivery.errorMessage = 'Webhook deleted or disabled';
    await delivery.save();
    return;
  }

  const startTime = Date.now();
  let decryptedSecret: string;
  try {
    decryptedSecret = decryptSecret(webhook.secretEncrypted);
  } catch (err) {
    delivery.status = 'FAILED';
    delivery.errorMessage = `Secret decryption error: ${(err as Error).message}`;
    await delivery.save();
    return;
  }

  const bodyStr = JSON.stringify(payload);
  const timestampUnix = Math.floor(new Date(payload.timestamp).getTime() / 1000);
  const signatureHeader = computeHmacSignature(decryptedSecret, timestampUnix, bodyStr);

  try {
    // Delivery-time SSRF validation
    await validateWebhookUrl(webhook.url);

    const parsedUrl = new URL(webhook.url);

    const result = await new Promise<{ statusCode: number; duration: number }>((resolve, reject) => {
      const req = https.request(
        parsedUrl,
        {
          method: 'POST',
          agent: ssrfAgent,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr),
            'X-Documan-Event-Id': payload.eventId,
            'X-Documan-Timestamp': timestampUnix.toString(),
            'X-Documan-Signature': signatureHeader,
            'User-Agent': 'Documan-Webhook-Dispatcher/1.0',
          },
          timeout: 5000, // 5s hard timeout
        },
        (res) => {
          // Redirects prohibited (maxRedirects = 0)
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
            return reject(new Error(`HTTP redirects prohibited (Received HTTP ${res.statusCode})`));
          }
          res.resume(); // consume response body
          resolve({
            statusCode: res.statusCode || 200,
            duration: Date.now() - startTime,
          });
        },
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy(new Error('ETIMEDOUT: Webhook request timed out after 5000ms'));
      });

      req.write(bodyStr);
      req.end();
    });

    // Check HTTP Status
    if (result.statusCode >= 200 && result.statusCode < 300) {
      delivery.status = 'SUCCESS';
      delivery.httpStatus = result.statusCode;
      delivery.requestDurationMs = result.duration;
      await delivery.save();

      // Reset consecutive failures on success
      webhook.consecutiveFailures = 0;
      await webhook.save();
    } else {
      await handleFailedDeliveryAttempt(webhook, delivery, result.statusCode, `Received HTTP ${result.statusCode}`, result.duration);
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    const errMsg = (err as Error).message || 'Delivery request failed';
    await handleFailedDeliveryAttempt(webhook, delivery, undefined, errMsg, duration);
  }
}

async function handleFailedDeliveryAttempt(
  webhook: InstanceType<typeof Webhook>,
  delivery: InstanceType<typeof WebhookDelivery>,
  httpStatus?: number,
  errorMessage?: string,
  duration?: number,
): Promise<void> {
  const currentAttempt = delivery.attemptNumber;
  if (httpStatus !== undefined) delivery.httpStatus = httpStatus;
  if (duration !== undefined) delivery.requestDurationMs = duration;
  if (errorMessage !== undefined) delivery.errorMessage = errorMessage;

  // Increment consecutive failures on webhook
  webhook.consecutiveFailures += 1;

  // Circuit breaker: Auto-disable after 50 consecutive failures
  if (webhook.consecutiveFailures >= 50) {
    webhook.isEnabled = false;
    await webhook.save();

    // Trigger in-app notification to Project Owner
    await safeNotify(async () => {
      await createNotificationInternal({
        recipientUserId: webhook.createdBy,
        documentId: webhook.projectId, // project reference
        type: 'CHANGES_REQUESTED', // status notification type
      });
    });
  } else {
    await webhook.save();
  }

  // Determine if retryable (Max 4 attempts)
  const isRetryableStatus = !httpStatus || httpStatus === 429 || httpStatus >= 500;
  if (currentAttempt < 4 && isRetryableStatus) {
    delivery.status = 'PENDING';
    delivery.attemptNumber = currentAttempt + 1;

    // Backoff schedule: +15s (att 2), +2m (att 3), +10m (att 4)
    const backoffSeconds = currentAttempt === 1 ? 15 : currentAttempt === 2 ? 120 : 600;
    delivery.nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);
    await delivery.save();
  } else {
    delivery.status = 'FAILED';
    await delivery.save();
  }
}

export async function processPendingWebhookDeliveries(payloadFallback?: WebhookEventPayload): Promise<void> {
  const pendingDeliveries = await WebhookDelivery.find({
    status: 'PENDING',
    nextAttemptAt: { $lte: new Date() },
  }).limit(20);

  for (const delivery of pendingDeliveries) {
    const payload: WebhookEventPayload = payloadFallback || {
      eventId: delivery.eventId,
      eventType: delivery.eventType,
      timestamp: delivery.createdAt.toISOString(),
      projectId: delivery.projectId.toString(),
    };

    await processSingleDeliveryAttempt(delivery._id, payload);
  }
}

export async function safeDispatchWebhook(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.warn('Failed to dispatch webhook event (non-blocking):', error);
  }
}
