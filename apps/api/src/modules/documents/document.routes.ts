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
  updateDocumentStatusController,
  verifyDocumentImpactController,
  getDocumentHealthController,
  updateDocumentStewardController,
} from './document.controller.js';

import { confirmDocumentFreshnessHandler } from '../governance/governance.controller.js';
import { getForwardEvidenceController } from '../knowledge/evidence.controller.js';

import {
  getDocumentDependenciesController,
} from './document-relationship.controller.js';

import {
  createDocumentSchema,
  documentsQuerySchema,
  updateDocumentSchema,
  documentIdParamsSchema,
  documentAuditHistoryQuerySchema,
  getDocumentDependenciesQuerySchema,
  updateDocumentStatusSchema,
  verifyDocumentImpactSchema,
} from './document.schema.js';

import { documentUpload } from '../../middleware/uploads/document-upload.middleware.js';
import { documentShareRouter } from '../document-shares/document-share.routes.js';
import { documentRelationshipRouter } from './document-relationship.routes.js';
import { documentReferenceRouter } from './document-reference.routes.js';
import { documentReviewRouter } from './document-review.routes.js';
import { documentApiEndpointRouter } from '../api-specs/api-spec.routes.js';
import { assuranceRouter } from '../governance/assurance.routes.js';

const documentRouter = Router();

documentRouter.use('/:id/shares', documentShareRouter);
documentRouter.use('/:id/relationships', documentRelationshipRouter);
documentRouter.use('/:id/references', documentReferenceRouter);
documentRouter.use('/:id/reviews', documentReviewRouter);
documentRouter.use('/:id/api-endpoints', documentApiEndpointRouter);
documentRouter.use('/:id/assurance', assuranceRouter);

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
  '/:id/health',
  authenticate,
  validateParams(documentIdParamsSchema),
  getDocumentHealthController,
);

documentRouter.patch(
  '/:id/steward',
  authenticate,
  validateParams(documentIdParamsSchema),
  updateDocumentStewardController,
);

documentRouter.get(
  '/:id/dependencies',
  authenticate,
  validateParams(documentIdParamsSchema),
  validateQuery(getDocumentDependenciesQuerySchema),
  getDocumentDependenciesController,
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

documentRouter.patch(
  '/:id/status',
  authenticate,
  validateParams(documentIdParamsSchema),
  validateBody(updateDocumentStatusSchema),
  updateDocumentStatusController,
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

documentRouter.post(
  '/:id/confirm-freshness',
  authenticate,
  validateParams(documentIdParamsSchema),
  confirmDocumentFreshnessHandler,
);

import {
  listDocumentVersionsController,
  getDocumentVersionController,
  compareDocumentVersionsController,
} from './document-version.controller.js';

documentRouter.post(
  '/:id/verify-impact',
  authenticate,
  validateParams(documentIdParamsSchema),
  validateBody(verifyDocumentImpactSchema),
  verifyDocumentImpactController,
);

documentRouter.get(
  '/:id/versions',
  authenticate,
  listDocumentVersionsController,
);

documentRouter.get(
  '/:id/versions/:versionId',
  authenticate,
  getDocumentVersionController,
);

documentRouter.post(
  '/:id/versions/compare',
  authenticate,
  compareDocumentVersionsController,
);

documentRouter.get(
  '/:id/evidence',
  authenticate,
  getForwardEvidenceController,
);

export { documentRouter };