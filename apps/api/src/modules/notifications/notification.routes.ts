import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  validateParams,
  validateQuery,
} from '../../middleware/validate.middleware.js';
import {
  getNotificationsController,
  markNotificationAsReadController,
  markAllNotificationsAsReadController,
} from './notification.controller.js';
import {
  getNotificationsQuerySchema,
  notificationIdParamsSchema,
} from './notification.schema.js';

export const notificationRouter = Router();

notificationRouter.get(
  '/',
  authenticate,
  validateQuery(getNotificationsQuerySchema),
  getNotificationsController,
);

notificationRouter.patch(
  '/:id/read',
  authenticate,
  validateParams(notificationIdParamsSchema),
  markNotificationAsReadController,
);

notificationRouter.post(
  '/mark-all-read',
  authenticate,
  markAllNotificationsAsReadController,
);
