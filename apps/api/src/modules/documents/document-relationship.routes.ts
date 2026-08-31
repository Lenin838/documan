import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../middleware/validate.middleware.js';
import {
  createDocumentRelationshipController,
  getDocumentRelationshipsController,
  deleteDocumentRelationshipController,
  getDocumentDependenciesController,
} from './document-relationship.controller.js';
import {
  createDocumentRelationshipSchema,
  documentRelationshipParamsSchema,
  documentRelationshipIdParamsSchema,
} from './document-relationship.schema.js';
import { getDocumentDependenciesQuerySchema } from './document.schema.js';

const documentRelationshipRouter = Router({ mergeParams: true });

documentRelationshipRouter.get(
  '/dependencies',
  authenticate,
  validateParams(documentRelationshipParamsSchema),
  validateQuery(getDocumentDependenciesQuerySchema),
  getDocumentDependenciesController,
);

documentRelationshipRouter.post(
  '/',
  authenticate,
  validateParams(documentRelationshipParamsSchema),
  validateBody(createDocumentRelationshipSchema),
  createDocumentRelationshipController,
);

documentRelationshipRouter.get(
  '/',
  authenticate,
  validateParams(documentRelationshipParamsSchema),
  getDocumentRelationshipsController,
);

documentRelationshipRouter.delete(
  '/:relationshipId',
  authenticate,
  validateParams(documentRelationshipIdParamsSchema),
  deleteDocumentRelationshipController,
);

export { documentRelationshipRouter };
