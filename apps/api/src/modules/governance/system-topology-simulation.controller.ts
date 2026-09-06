import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import { simulateSystemTopologyGovernanceGate } from './system-topology-simulation.service.js';
import { simulateSystemGateSchema } from './system-topology-simulation.schema.js';
import type { SimulateSystemGateInput } from './system-topology-simulation.types.js';

export async function simulateSystemTopologyGateHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };

  const parsed = simulateSystemGateSchema.parse({ body: req.body });
  const scenarioInput: SimulateSystemGateInput = parsed.body;

  if (scenarioInput.rootProjectId !== projectId) {
    res.status(400).json({
      success: false,
      error: 'INVALID_PROJECT_CONTEXT',
      message: 'rootProjectId in request body must match the projectId parameter in the route URL',
    });
    return;
  }

  const result = await simulateSystemTopologyGovernanceGate(
    user.userId,
    user.role,
    projectId,
    scenarioInput,
  );

  sendSuccess(res, result, 200);
}
