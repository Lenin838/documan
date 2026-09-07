import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { postContractChangePlanHandler } from './system-contract-plan.controller.js';

export const systemContractPlanRouter = Router();

systemContractPlanRouter.post(
  '/projects/:projectId/contract-change-plan',
  authenticate,
  postContractChangePlanHandler,
);
