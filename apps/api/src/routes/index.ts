import { Router } from 'express';

import { healthRouter } from '../modules/health/health.routes.js';
import { userRouter } from '../modules/users/user.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/users', userRouter);

export { apiRouter };