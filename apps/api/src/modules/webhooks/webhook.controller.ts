import type { Request, Response } from 'express';

import { sendSuccess } from '../../utils/api-response.js';
import type { CreateWebhookInput, UpdateWebhookInput, GetDeliveriesQueryInput } from './webhook.schema.js';
import {
  createWebhook,
  getProjectWebhooks,
  getWebhookById,
  updateWebhook,
  deleteWebhook,
  rotateWebhookSecret,
  getWebhookDeliveries,
} from './webhook.service.js';

export async function createWebhookHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };
  const input = req.body as CreateWebhookInput;

  const webhook = await createWebhook(user.userId, user.role, projectId, input);
  sendSuccess(res, webhook, 201);
}

export async function getProjectWebhooksHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };

  const webhooks = await getProjectWebhooks(user.userId, user.role, projectId);
  sendSuccess(res, { webhooks }, 200);
}

export async function getWebhookByIdHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId, id: webhookId } = req.params as { projectId: string; id: string };

  const webhook = await getWebhookById(user.userId, user.role, projectId, webhookId);
  sendSuccess(res, { webhook }, 200);
}

export async function updateWebhookHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId, id: webhookId } = req.params as { projectId: string; id: string };
  const input = req.body as UpdateWebhookInput;

  const webhook = await updateWebhook(user.userId, user.role, projectId, webhookId, input);
  sendSuccess(res, { webhook }, 200);
}

export async function deleteWebhookHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId, id: webhookId } = req.params as { projectId: string; id: string };

  const result = await deleteWebhook(user.userId, user.role, projectId, webhookId);
  sendSuccess(res, result, 200);
}

export async function rotateWebhookSecretHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId, id: webhookId } = req.params as { projectId: string; id: string };

  const webhook = await rotateWebhookSecret(user.userId, user.role, projectId, webhookId);
  sendSuccess(res, webhook, 200);
}

export async function getWebhookDeliveriesHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId, id: webhookId } = req.params as { projectId: string; id: string };
  const query = (res.locals.validatedQuery || req.query) as GetDeliveriesQueryInput;

  const result = await getWebhookDeliveries(user.userId, user.role, projectId, webhookId, query);
  sendSuccess(res, result, 200);
}
