import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { authenticateGateToken } from '../../middleware/gate-auth.middleware.js';
import { gateCheckRateLimiter } from '../../middleware/rate-limit.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  getProjectGovernanceHandler,
  updateProjectGovernanceHandler,
  evaluateProjectGovernanceHandler,
  createProjectGateTokenHandler,
  getProjectGateTokensHandler,
  revokeProjectGateTokenHandler,
  gateCheckHandler,
} from './governance.controller.js';
import {
  updateGovernanceSettingsSchema,
  createGateTokenSchema,
} from './governance.schema.js';

export const projectGovernanceRouter = Router({ mergeParams: true });

// Programmatic Gate Check endpoint (Authenticated via dedicated Gate Token)
projectGovernanceRouter.post(
  '/gate-check',
  gateCheckRateLimiter,
  authenticateGateToken,
  gateCheckHandler,
);

// Token & Governance administration endpoints (Authenticated via User JWT / Session)
projectGovernanceRouter.get('/', authenticate, getProjectGovernanceHandler);
projectGovernanceRouter.patch(
  '/',
  authenticate,
  validateBody(updateGovernanceSettingsSchema),
  updateProjectGovernanceHandler,
);
projectGovernanceRouter.post('/evaluate', authenticate, evaluateProjectGovernanceHandler);

projectGovernanceRouter.post(
  '/gate-tokens',
  authenticate,
  validateBody(createGateTokenSchema),
  createProjectGateTokenHandler,
);
projectGovernanceRouter.get('/gate-tokens', authenticate, getProjectGateTokensHandler);
projectGovernanceRouter.delete('/gate-tokens/:tokenId', authenticate, revokeProjectGateTokenHandler);
