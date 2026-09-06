import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { getSystemBaselineAlignmentHandler } from './system-baseline-alignment.controller.js';

export const systemBaselineAlignmentRouter = Router({ mergeParams: true });

systemBaselineAlignmentRouter.get(
  '/',
  authenticate,
  getSystemBaselineAlignmentHandler,
);
