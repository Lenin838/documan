import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  validateBody,
  validateParams,
} from '../../middleware/validate.middleware.js';
import {
  createDocumentShareController,
  getDocumentSharesController,
  revokeDocumentShareController,
  updateDocumentShareController,
} from './document-share.controller.js';
import {
  createDocumentShareSchema,
  documentShareIdParamsSchema,
  documentShareParamsSchema,
  updateDocumentShareSchema,
} from './document-share.schema.js';

const documentShareRouter = Router({ mergeParams: true });

documentShareRouter.post(
  '/',
  authenticate,
  validateParams(documentShareParamsSchema),
  validateBody(createDocumentShareSchema),
  createDocumentShareController,
);

documentShareRouter.get(
  '/',
  authenticate,
  validateParams(documentShareParamsSchema),
  getDocumentSharesController,
);

documentShareRouter.patch(
  '/:shareId',
  authenticate,
  validateParams(documentShareIdParamsSchema),
  validateBody(updateDocumentShareSchema),
  updateDocumentShareController,
);

documentShareRouter.delete(
  '/:shareId',
  authenticate,
  validateParams(documentShareIdParamsSchema),
  revokeDocumentShareController,
);

export { documentShareRouter };
