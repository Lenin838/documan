import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  getAssuranceHandler,
  evaluateAssuranceHandler,
  grantWaiverHandler,
  revokeWaiverHandler,
} from './assurance.controller.js';

const assuranceRouter = Router({ mergeParams: true });

assuranceRouter.get('/', authenticate, getAssuranceHandler);
assuranceRouter.post('/evaluate', authenticate, evaluateAssuranceHandler);
assuranceRouter.post('/waivers', authenticate, grantWaiverHandler);
assuranceRouter.delete('/waivers/:checkId', authenticate, revokeWaiverHandler);

export { assuranceRouter };
