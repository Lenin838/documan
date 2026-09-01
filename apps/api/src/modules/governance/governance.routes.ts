import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  getProjectGovernanceHandler,
  updateProjectGovernanceHandler,
  evaluateProjectGovernanceHandler,
} from './governance.controller.js';
import { updateGovernanceSettingsSchema } from './governance.schema.js';

export const projectGovernanceRouter = Router({ mergeParams: true });

projectGovernanceRouter.use(authenticate);

projectGovernanceRouter.get('/', getProjectGovernanceHandler);
projectGovernanceRouter.patch(
  '/',
  validateBody(updateGovernanceSettingsSchema),
  updateProjectGovernanceHandler,
);
projectGovernanceRouter.post('/evaluate', evaluateProjectGovernanceHandler);
