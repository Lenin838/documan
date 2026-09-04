import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  generateVerificationPlanHandler,
  getVerificationPlanByIdHandler,
  updateTaskStatusHandler,
  bypassPlanHandler,
} from './verification-plan.controller.js';

export const verificationPlanRouter = Router();

// Single Plan retrieval
verificationPlanRouter.get('/:planId', authenticate, getVerificationPlanByIdHandler);

// Bypass Plan
verificationPlanRouter.post('/:planId/bypass', authenticate, bypassPlanHandler);

export const verificationTaskRouter = Router();

// Update task status
verificationTaskRouter.patch('/:taskId', authenticate, updateTaskStatusHandler);

export const documentVerificationPlanRouter = Router({ mergeParams: true });

// Explicit plan generation for document
documentVerificationPlanRouter.post('/generate', authenticate, generateVerificationPlanHandler);
