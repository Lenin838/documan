import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  getReverseDocumentController,
  getReverseEndpointController,
  getReverseReferenceController,
} from './evidence.controller.js';

const evidenceRouter = Router();

evidenceRouter.use(authenticate);

evidenceRouter.get('/reverse-endpoint', getReverseEndpointController);
evidenceRouter.get('/reverse-document', getReverseDocumentController);
evidenceRouter.get('/reverse-reference', getReverseReferenceController);

export { evidenceRouter };
