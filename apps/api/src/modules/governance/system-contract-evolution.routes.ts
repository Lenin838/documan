import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { getContractEvolutionDeltaController } from './system-contract-evolution.controller.js';

export const systemContractEvolutionRouter = Router();

systemContractEvolutionRouter.get(
  '/contract-evolution/delta',
  authenticate,
  getContractEvolutionDeltaController,
);
