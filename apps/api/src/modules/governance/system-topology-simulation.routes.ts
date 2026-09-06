import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { simulateSystemTopologyGateHandler } from './system-topology-simulation.controller.js';

export const systemTopologySimulationRouter = Router({ mergeParams: true });

// Read-only What-If Simulation Sandbox endpoint (Authenticated via User JWT)
systemTopologySimulationRouter.post('/simulate', authenticate, simulateSystemTopologyGateHandler);
