import { Router } from 'express';

import { validateBody } from '../../middleware/validate.middleware.js';
import {
  createUserController,
  getCurrentUserController,
} from './user.controller.js';
import { createUserSchema } from './user.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const userRouter = Router();

userRouter.post(
  '/',
  validateBody(createUserSchema),
  createUserController,
);
userRouter.get('/me', authenticate, getCurrentUserController);

export { userRouter };