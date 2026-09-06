import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import {
  grantWaiverHandler,
  listWaiversHandler,
  revokeWaiverHandler,
} from './system-governance-waiver.controller.js';
import {
  grantSystemGovernanceWaiverSchema,
  revokeSystemGovernanceWaiverSchema,
} from './system-governance-waiver.schema.js';

export const systemGovernanceWaiverRouter = Router({ mergeParams: true });

systemGovernanceWaiverRouter.post(
  '/',
  authenticate,
  validateBody(grantSystemGovernanceWaiverSchema),
  grantWaiverHandler,
);

systemGovernanceWaiverRouter.get(
  '/',
  authenticate,
  listWaiversHandler,
);

systemGovernanceWaiverRouter.patch(
  '/:waiverId/revoke',
  authenticate,
  validateBody(revokeSystemGovernanceWaiverSchema),
  revokeWaiverHandler,
);
