import { Router } from 'express';

import {
  authenticate,
} from '../../middleware/auth.middleware.js';

import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../middleware/validate.middleware.js';

import {
  createDocumentController,
  getAllDocumentsController,
  getDocumentByIdController,
  updateDocumentController,
  deleteDocumentController,
} from './document.controller.js';

import {
  createDocumentSchema,
  documentsQuerySchema,
  updateDocumentSchema,
  documentIdParamsSchema,
} from './document.schema.js';

const documentRouter = Router();

documentRouter.post(
  '/',
  authenticate,
  validateBody(createDocumentSchema),
  createDocumentController,
);

documentRouter.get(
  '/',
  authenticate,
  validateQuery(documentsQuerySchema),
  getAllDocumentsController,
);

documentRouter.get(
  '/:id',
  authenticate,
  validateParams(documentIdParamsSchema),
  getDocumentByIdController,
);

documentRouter.patch(
  '/:id',
  authenticate,
  validateParams(documentIdParamsSchema),
  validateBody(updateDocumentSchema),
  updateDocumentController,
);

documentRouter.delete(
  '/:id',
  authenticate,
  validateParams(documentIdParamsSchema),
  deleteDocumentController,
);

export { documentRouter };