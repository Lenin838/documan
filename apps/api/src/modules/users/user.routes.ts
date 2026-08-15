import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';

import {
  createUserController,
  getCurrentUserController,
  updateCurrentUserController,
  changePasswordController
} from './user.controller.js';

import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from './user.schema.js';

const userRouter = Router();

userRouter.post(
  '/',
  validateBody(createUserSchema),
  createUserController,
);

userRouter.get(
  '/me',
  authenticate,
  getCurrentUserController,
);

userRouter.patch(
  '/me',
  authenticate,
  validateBody(updateUserSchema),
  updateCurrentUserController,
);

userRouter.patch(
  '/me/password',
  authenticate,
  validateBody(changePasswordSchema),
  changePasswordController,
);

export { userRouter };