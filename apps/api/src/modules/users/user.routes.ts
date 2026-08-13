import { Router } from 'express';

import { validateBody } from '../../middleware/validate.middleware.js';
import { createUserController } from './user.controller.js';
import { createUserSchema } from './user.schema.js';

const userRouter = Router();

userRouter.post(
  '/',
  validateBody(createUserSchema),
  createUserController,
);

export { userRouter };