import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { importApiSpecSchema, linkEndpointSchema } from './api-spec.schema.js';
import {
  importProjectApiSpecHandler,
  getProjectApiSpecHandler,
  deleteProjectApiSpecHandler,
  linkDocumentApiEndpointHandler,
  unlinkDocumentApiEndpointHandler,
  getDocumentApiEndpointsHandler,
} from './api-spec.controller.js';

export const projectApiSpecRouter = Router({ mergeParams: true });
projectApiSpecRouter.use(authenticate);

projectApiSpecRouter.post(
  '/',
  validateBody(importApiSpecSchema),
  importProjectApiSpecHandler,
);
projectApiSpecRouter.get('/', getProjectApiSpecHandler);
projectApiSpecRouter.delete('/:specId', deleteProjectApiSpecHandler);

export const documentApiEndpointRouter = Router({ mergeParams: true });
documentApiEndpointRouter.use(authenticate);

documentApiEndpointRouter.post(
  '/',
  validateBody(linkEndpointSchema),
  linkDocumentApiEndpointHandler,
);
documentApiEndpointRouter.get('/', getDocumentApiEndpointsHandler);
documentApiEndpointRouter.delete('/:endpointId', unlinkDocumentApiEndpointHandler);
