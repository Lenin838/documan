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
  restoreDocumentController,
  getDocumentAuditHistoryController,
  downloadDocumentController,
  viewDocumentController,
} from './document.controller.js';

import {
  createDocumentSchema,
  documentsQuerySchema,
  updateDocumentSchema,
  documentIdParamsSchema,
  documentAuditHistoryQuerySchema,
} from './document.schema.js';

import { documentUpload } from '../../middleware/uploads/document-upload.middleware.js';
import { documentShareRouter } from '../document-shares/document-share.routes.js';
import { documentRelationshipRouter } from './document-relationship.routes.js';
import { documentReferenceRouter } from './document-reference.routes.js';
import { documentReviewRouter } from './document-review.routes.js';

const documentRouter = Router();

documentRouter.use('/:id/shares', documentShareRouter);
documentRouter.use('/:id/relationships', documentRelationshipRouter);
documentRouter.use('/:id/references', documentReferenceRouter);
documentRouter.use('/:id/reviews', documentReviewRouter);

documentRouter.post(
  '/',
  authenticate,
  documentUpload.single('file'),
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
  '/:id/audit-history',
  authenticate,
  validateParams(documentIdParamsSchema),
  validateQuery(documentAuditHistoryQuerySchema),
  getDocumentAuditHistoryController,
);

documentRouter.get(
  '/:id/view',
  authenticate,
  validateParams(documentIdParamsSchema),
  viewDocumentController,
);

documentRouter.get(
  '/:id/download',
  authenticate,
  validateParams(documentIdParamsSchema),
  downloadDocumentController,
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
  documentUpload.single('file'),
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

documentRouter.patch(
  '/:id/restore',
  authenticate,
  validateParams(documentIdParamsSchema),
  restoreDocumentController,
);

export { documentRouter };