import { Router } from 'express';

import { healthRouter } from '../modules/health/health.routes.js';
import { userRouter } from '../modules/users/user.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { documentRouter } from '../modules/documents/document.routes.js';
import { folderRouter } from '../modules/folders/folder.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/documents', documentRouter);
apiRouter.use('/folders', folderRouter);

export { apiRouter };