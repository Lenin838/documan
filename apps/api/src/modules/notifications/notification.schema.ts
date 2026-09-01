import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const getNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  isRead: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type GetNotificationsQueryInput = z.infer<
  typeof getNotificationsQuerySchema
>;

export const notificationIdParamsSchema = z.object({
  id: z.string().regex(OBJECT_ID_REGEX, 'Invalid notification ID'),
});

export type NotificationIdParamsInput = z.infer<
  typeof notificationIdParamsSchema
>;
