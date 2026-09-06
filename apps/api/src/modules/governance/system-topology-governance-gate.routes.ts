import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { authenticateGateToken } from '../../middleware/gate-auth.middleware.js';
import { gateCheckRateLimiter } from '../../middleware/rate-limit.middleware.js';
import {
  getSystemGovernanceGateHandler,
  systemGateCheckHandler,
} from './system-topology-governance-gate.controller.js';

export const systemTopologyGovernanceGateRouter = Router({ mergeParams: true });

// Programmatic system gate check endpoint (Authenticated via CI/CD Gate Token or User JWT)
systemTopologyGovernanceGateRouter.post(
  '/gate-check',
  gateCheckRateLimiter,
  (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && !authHeader.includes('documan_gate_')) {
      return authenticate(req, res, next);
    }
    return authenticateGateToken(req, res, next);
  },
  systemGateCheckHandler,
);

// Web UI Read-only GET endpoint (Authenticated via User JWT)
systemTopologyGovernanceGateRouter.get('/', authenticate, getSystemGovernanceGateHandler);
