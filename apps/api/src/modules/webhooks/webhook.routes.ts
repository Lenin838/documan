import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js';
import {
  createWebhookHandler,
  getProjectWebhooksHandler,
  getWebhookByIdHandler,
  updateWebhookHandler,
  deleteWebhookHandler,
  rotateWebhookSecretHandler,
  getWebhookDeliveriesHandler,
} from './webhook.controller.js';
import {
  createWebhookSchema,
  updateWebhookSchema,
  getDeliveriesQuerySchema,
} from './webhook.schema.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', validateBody(createWebhookSchema), createWebhookHandler);
router.get('/', getProjectWebhooksHandler);
router.get('/:id', getWebhookByIdHandler);
router.patch('/:id', validateBody(updateWebhookSchema), updateWebhookHandler);
router.delete('/:id', deleteWebhookHandler);
router.post('/:id/rotate-secret', rotateWebhookSecretHandler);
router.get('/:id/deliveries', validateQuery(getDeliveriesQuerySchema), getWebhookDeliveriesHandler);

export default router;
