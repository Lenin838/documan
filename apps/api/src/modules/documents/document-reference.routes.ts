import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  validateBody,
  validateParams,
} from '../../middleware/validate.middleware.js';
import {
  createDocumentReferenceController,
  getDocumentReferencesController,
  updateDocumentReferenceController,
  deleteDocumentReferenceController,
} from './document-reference.controller.js';
import {
  createDocumentReferenceSchema,
  updateDocumentReferenceSchema,
  documentReferenceParamsSchema,
} from './document-reference.schema.js';

const documentReferenceRouter = Router({ mergeParams: true });

documentReferenceRouter.post(
  '/',
  authenticate,
  validateParams(documentReferenceParamsSchema),
  validateBody(createDocumentReferenceSchema),
  createDocumentReferenceController,
);

documentReferenceRouter.get(
  '/',
  authenticate,
  validateParams(documentReferenceParamsSchema),
  getDocumentReferencesController,
);

documentReferenceRouter.patch(
  '/:referenceId',
  authenticate,
  validateParams(documentReferenceParamsSchema),
  validateBody(updateDocumentReferenceSchema),
  updateDocumentReferenceController,
);

documentReferenceRouter.delete(
  '/:referenceId',
  authenticate,
  validateParams(documentReferenceParamsSchema),
  deleteDocumentReferenceController,
);

export { documentReferenceRouter };
