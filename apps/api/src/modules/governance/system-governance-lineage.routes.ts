import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  getHistoricalSystemGateHandler,
  getSystemGovernanceTimelineHandler,
  getSystemGovernanceLineageDiffHandler,
} from './system-governance-lineage.controller.js';

const router = Router();

router.use(authenticate);

router.get('/system-topology/historical-gate', getHistoricalSystemGateHandler);
router.get('/system-topology/lineage', getSystemGovernanceTimelineHandler);
router.get('/system-topology/lineage-diff', getSystemGovernanceLineageDiffHandler);

export default router;
