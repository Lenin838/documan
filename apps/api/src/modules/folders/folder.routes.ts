import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  validateBody,
  validateParams,
} from '../../middleware/validate.middleware.js';
import {
  createFolderController,
  deleteFolderController,
  getFolderByIdController,
  getFoldersController,
  updateFolderController,
} from './folder.controller.js';
import {
  createFolderSchema,
  folderIdParamsSchema,
  updateFolderSchema,
} from './folder.schema.js';

const folderRouter = Router();

folderRouter.post(
  '/',
  authenticate,
  validateBody(createFolderSchema),
  createFolderController,
);

folderRouter.get('/', authenticate, getFoldersController);

folderRouter.get(
  '/:id',
  authenticate,
  validateParams(folderIdParamsSchema),
  getFolderByIdController,
);

folderRouter.patch(
  '/:id',
  authenticate,
  validateParams(folderIdParamsSchema),
  validateBody(updateFolderSchema),
  updateFolderController,
);

folderRouter.delete(
  '/:id',
  authenticate,
  validateParams(folderIdParamsSchema),
  deleteFolderController,
);

export { folderRouter };
