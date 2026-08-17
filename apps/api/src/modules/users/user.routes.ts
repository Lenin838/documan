import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody,validateQuery } from '../../middleware/validate.middleware.js';
import { requireRole } from '../../middleware/authorization.middleware.js';
import { validateParams } from '../../middleware/validate.middleware.js';

import {
  createUserController,
  getCurrentUserController,
  updateCurrentUserController,
  changePasswordController,
  getAllUsersController,
  getUserByIdController,
  adminUpdateUserController,
  updateUserStatusController,
} from './user.controller.js';

import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  userIdParamsSchema,
  adminUpdateUserSchema,
  updateUserStatusSchema,
  adminUsersQuerySchema,
} from './user.schema.js';

const userRouter = Router();

userRouter.post(
  '/',
  validateBody(createUserSchema),
  createUserController,
);

userRouter.get(
  '/',
  authenticate,
  requireRole('admin'),
  validateQuery(adminUsersQuerySchema),
  getAllUsersController,
);

userRouter.get(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateParams(userIdParamsSchema),
  getUserByIdController,
);

userRouter.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateParams(userIdParamsSchema),
  validateBody(adminUpdateUserSchema),
  adminUpdateUserController,
);

userRouter.patch(
  '/:id/status',
  authenticate,
  requireRole('admin'),
  validateParams(userIdParamsSchema),
  validateBody(updateUserStatusSchema),
  updateUserStatusController,
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