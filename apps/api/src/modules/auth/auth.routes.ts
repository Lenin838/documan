import { Router } from 'express';

import { validateBody } from '../../middleware/validate.middleware.js';
import {
  loginRateLimiter,
  refreshRateLimiter,
} from '../../middleware/rate-limit.middleware.js';

import {
  loginController,
  logoutController,
  refreshController,
} from './auth.controller.js';
import { loginSchema } from './auth.schema.js';

const authRouter = Router();

authRouter.post(
  '/login',
  loginRateLimiter,
  validateBody(loginSchema),
  loginController,
);

authRouter.post(
  '/refresh',
  refreshRateLimiter,
  refreshController,
);

authRouter.post('/logout', logoutController);

export { authRouter };