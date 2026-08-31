import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  validateBody,
  validateParams,
} from '../../middleware/validate.middleware.js';
import {
  createDocumentReviewController,
  getDocumentReviewsController,
  approveDocumentReviewController,
  requestChangesDocumentReviewController,
  getPendingReviewsController,
} from './document-review.controller.js';
import {
  createDocumentReviewSchema,
  resolveDocumentReviewSchema,
  documentReviewParamsSchema,
} from './document-review.schema.js';

const documentReviewRouter = Router({ mergeParams: true });

documentReviewRouter.post(
  '/',
  authenticate,
  validateParams(documentReviewParamsSchema),
  validateBody(createDocumentReviewSchema),
  createDocumentReviewController,
);

documentReviewRouter.get(
  '/',
  authenticate,
  validateParams(documentReviewParamsSchema),
  getDocumentReviewsController,
);

documentReviewRouter.post(
  '/:reviewId/approve',
  authenticate,
  validateParams(documentReviewParamsSchema),
  validateBody(resolveDocumentReviewSchema),
  approveDocumentReviewController,
);

documentReviewRouter.post(
  '/:reviewId/request-changes',
  authenticate,
  validateParams(documentReviewParamsSchema),
  validateBody(resolveDocumentReviewSchema),
  requestChangesDocumentReviewController,
);

const reviewRouter = Router();

reviewRouter.get('/pending', authenticate, getPendingReviewsController);

export { documentReviewRouter, reviewRouter };
