import { z } from 'zod';

export const VALID_WEBHOOK_EVENTS = [
  'REVIEW_REQUESTED',
  'REVIEW_APPROVED',
  'CHANGES_REQUESTED',
  'DOCUMENT_SHARED',
  'UPSTREAM_STALE',
  'UPSTREAM_DEPRECATED',
  '*',
] as const;

export const createWebhookSchema = z.object({
  url: z.string().url('Invalid URL format').refine((val) => val.startsWith('https://'), {
    message: 'Webhook URL must use HTTPS protocol',
  }),
  description: z.string().max(250, 'Description cannot exceed 250 characters').optional(),
  events: z.array(z.enum(VALID_WEBHOOK_EVENTS)).min(1, 'At least one event must be selected').optional().default(['*']),
});

export const updateWebhookSchema = z.object({
  url: z.string().url('Invalid URL format').refine((val) => val.startsWith('https://'), {
    message: 'Webhook URL must use HTTPS protocol',
  }).optional(),
  description: z.string().max(250, 'Description cannot exceed 250 characters').optional(),
  events: z.array(z.enum(VALID_WEBHOOK_EVENTS)).min(1, 'At least one event must be selected').optional(),
  isEnabled: z.boolean().optional(),
});

export const getDeliveriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type GetDeliveriesQueryInput = z.infer<typeof getDeliveriesQuerySchema>;
