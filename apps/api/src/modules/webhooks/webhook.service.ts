import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { Webhook, type WebhookDocument } from './webhook.model.js';
import { WebhookDelivery } from './webhook-delivery.model.js';
import type { CreateWebhookInput, UpdateWebhookInput, GetDeliveriesQueryInput } from './webhook.schema.js';
import { validateWebhookUrl } from './ssrf-agent.js';
import {
  generateWebhookSecret,
  encryptSecret,
  maskWebhookSecret,
} from './webhook-crypto.utils.js';

export interface WebhookResponseItem {
  id: string;
  projectId: string;
  url: string;
  description?: string | undefined;
  events: string[];
  isEnabled: boolean;
  consecutiveFailures: number;
  secretMasked: string;
  secretPlaintextOnce?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

function validateObjectId(id: string, errorMessage = 'Resource not found', code = 'NOT_FOUND') {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, code);
  }
}

export async function verifyProjectWebhookAdminAuthority(
  projectId: string,
  userId: string,
  role: 'user' | 'admin',
) {
  validateObjectId(projectId, 'Project not found', 'PROJECT_NOT_FOUND');
  const project = await Project.findOne({ _id: projectId, isArchived: false });
  if (!project) {
    throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  }

  if (role !== 'admin' && project.ownerId.toString() !== userId) {
    throw new AppError('Forbidden: Webhook management requires Project Owner or Admin authority', 403, 'FORBIDDEN');
  }

  return project;
}

export function toWebhookResponseItem(
  doc: WebhookDocument & { _id: Types.ObjectId },
  plaintextSecretOnce?: string,
): WebhookResponseItem {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    url: doc.url,
    description: doc.description,
    events: doc.events,
    isEnabled: doc.isEnabled,
    consecutiveFailures: doc.consecutiveFailures,
    secretMasked: maskWebhookSecret(plaintextSecretOnce || 'doc_whsec_1234567890abcdef'),
    ...(plaintextSecretOnce ? { secretPlaintextOnce: plaintextSecretOnce } : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createWebhook(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  input: CreateWebhookInput,
) {
  await verifyProjectWebhookAdminAuthority(projectId, userId, role);

  // SSRF Validation
  await validateWebhookUrl(input.url);

  // Check max webhooks per project limit (5 max)
  const existingCount = await Webhook.countDocuments({
    projectId: new Types.ObjectId(projectId),
    isEnabled: true,
  });

  if (existingCount >= 5) {
    throw new AppError('Maximum active webhook limit (5) reached for this project', 400, 'WEBHOOK_LIMIT_EXCEEDED');
  }

  const rawSecret = generateWebhookSecret();
  const secretEncrypted = encryptSecret(rawSecret);

  const webhook = await Webhook.create({
    projectId: new Types.ObjectId(projectId),
    url: input.url,
    ...(input.description !== undefined ? { description: input.description } : {}),
    events: input.events || ['*'],
    secretEncrypted,
    isEnabled: true,
    consecutiveFailures: 0,
    createdBy: new Types.ObjectId(userId),
  });

  return toWebhookResponseItem(webhook, rawSecret);
}

export async function getProjectWebhooks(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
) {
  await verifyProjectWebhookAdminAuthority(projectId, userId, role);

  const webhooks = await Webhook.find({
    projectId: new Types.ObjectId(projectId),
  }).sort({ createdAt: -1 });

  return webhooks.map((w) => toWebhookResponseItem(w));
}

export async function getWebhookById(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  webhookId: string,
) {
  await verifyProjectWebhookAdminAuthority(projectId, userId, role);
  validateObjectId(webhookId, 'Webhook not found', 'WEBHOOK_NOT_FOUND');

  const webhook = await Webhook.findOne({
    _id: webhookId,
    projectId: new Types.ObjectId(projectId),
  });

  if (!webhook) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
  }

  return toWebhookResponseItem(webhook);
}

export async function updateWebhook(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  webhookId: string,
  input: UpdateWebhookInput,
) {
  await verifyProjectWebhookAdminAuthority(projectId, userId, role);
  validateObjectId(webhookId, 'Webhook not found', 'WEBHOOK_NOT_FOUND');

  const webhook = await Webhook.findOne({
    _id: webhookId,
    projectId: new Types.ObjectId(projectId),
  });

  if (!webhook) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
  }

  if (input.url !== undefined) {
    await validateWebhookUrl(input.url);
    webhook.url = input.url;
    // Reset consecutive failures if URL changes
    webhook.consecutiveFailures = 0;
  }

  if (input.description !== undefined) {
    webhook.description = input.description;
  }

  if (input.events !== undefined) {
    webhook.events = input.events;
  }

  if (input.isEnabled !== undefined) {
    webhook.isEnabled = input.isEnabled;
    if (input.isEnabled) {
      webhook.consecutiveFailures = 0;
    }
  }

  await webhook.save();
  return toWebhookResponseItem(webhook);
}

export async function deleteWebhook(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  webhookId: string,
) {
  await verifyProjectWebhookAdminAuthority(projectId, userId, role);
  validateObjectId(webhookId, 'Webhook not found', 'WEBHOOK_NOT_FOUND');

  const webhook = await Webhook.findOneAndDelete({
    _id: webhookId,
    projectId: new Types.ObjectId(projectId),
  });

  if (!webhook) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
  }

  return { message: 'Webhook deleted successfully', id: webhookId };
}

export async function rotateWebhookSecret(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  webhookId: string,
) {
  await verifyProjectWebhookAdminAuthority(projectId, userId, role);
  validateObjectId(webhookId, 'Webhook not found', 'WEBHOOK_NOT_FOUND');

  const webhook = await Webhook.findOne({
    _id: webhookId,
    projectId: new Types.ObjectId(projectId),
  });

  if (!webhook) {
    throw new AppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
  }

  const newRawSecret = generateWebhookSecret();
  const newSecretEncrypted = encryptSecret(newRawSecret);

  // Preserve current secret as previous for 24-hour grace period
  webhook.previousSecretEncrypted = webhook.secretEncrypted;
  webhook.previousSecretExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  webhook.secretEncrypted = newSecretEncrypted;
  await webhook.save();

  return toWebhookResponseItem(webhook, newRawSecret);
}

export async function getWebhookDeliveries(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  webhookId: string,
  query: GetDeliveriesQueryInput = { page: 1, limit: 20 },
) {
  await verifyProjectWebhookAdminAuthority(projectId, userId, role);
  validateObjectId(webhookId, 'Webhook not found', 'WEBHOOK_NOT_FOUND');

  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const [deliveries, total] = await Promise.all([
    WebhookDelivery.find({
      webhookId: new Types.ObjectId(webhookId),
      projectId: new Types.ObjectId(projectId),
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WebhookDelivery.countDocuments({
      webhookId: new Types.ObjectId(webhookId),
      projectId: new Types.ObjectId(projectId),
    }),
  ]);

  return {
    deliveries: deliveries.map((d) => ({
      id: d._id.toString(),
      webhookId: d.webhookId.toString(),
      projectId: d.projectId.toString(),
      eventId: d.eventId,
      eventType: d.eventType,
      attemptNumber: d.attemptNumber,
      status: d.status,
      httpStatus: d.httpStatus,
      requestDurationMs: d.requestDurationMs,
      errorMessage: d.errorMessage,
      attemptedAt: d.attemptedAt || d.createdAt,
      createdAt: d.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
