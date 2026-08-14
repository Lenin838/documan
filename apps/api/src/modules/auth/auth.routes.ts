import { Router } from 'express';

import { validateBody } from '../../middleware/validate.middleware.js';


import { loginController, logoutController ,refreshController } from './auth.controller.js';
import { loginSchema } from './auth.schema.js';

const authRouter = Router();

authRouter.post(
  '/login',
  validateBody(loginSchema),
  loginController,
);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', logoutController);

export { authRouter };