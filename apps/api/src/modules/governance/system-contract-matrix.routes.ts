import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { getSystemContractMatrixHandler } from './system-contract-matrix.controller.js';

export const systemContractMatrixRouter = Router();

systemContractMatrixRouter.get(
  '/api/v1/governance/system-contract-matrix',
  authenticate,
  getSystemContractMatrixHandler,
);
