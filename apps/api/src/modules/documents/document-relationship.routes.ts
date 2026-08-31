import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  validateBody,
  validateParams,
} from '../../middleware/validate.middleware.js';
import {
  createDocumentRelationshipController,
  getDocumentRelationshipsController,
  deleteDocumentRelationshipController,
} from './document-relationship.controller.js';
import {
  createDocumentRelationshipSchema,
  documentRelationshipParamsSchema,
  documentRelationshipIdParamsSchema,
} from './document-relationship.schema.js';

const documentRelationshipRouter = Router({ mergeParams: true });

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
