import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  createBaselineHandler,
  getProjectBaselinesHandler,
  getBaselineByIdHandler,
  compareBaselineHandler,
  archiveBaselineHandler,
  triggerDriftVerificationPlanHandler,
} from './baseline.controller.js';

export const baselineRouter = Router({ mergeParams: true });

baselineRouter.post('/', authenticate, createBaselineHandler);
baselineRouter.get('/', authenticate, getProjectBaselinesHandler);
baselineRouter.get('/:baselineId/compare', authenticate, compareBaselineHandler);
baselineRouter.get('/:baselineId', authenticate, getBaselineByIdHandler);
baselineRouter.post('/:baselineId/archive', authenticate, archiveBaselineHandler);
baselineRouter.post('/trigger-verification-plan', authenticate, triggerDriftVerificationPlanHandler);
