import type { Request, Response } from 'express';

import { sendSuccess } from '../../utils/api-response.js';
import { evaluateSystemTopologyGovernanceGate } from './system-topology-governance-gate.service.js';
import type { GateAuthenticatedRequest } from '../../middleware/gate-auth.middleware.js';

export async function getSystemGovernanceGateHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };

  const result = await evaluateSystemTopologyGovernanceGate(user.userId, user.role, projectId);
  sendSuccess(res, result, 200);
}

export async function systemGateCheckHandler(req: Request, res: Response) {
  const { projectId } = req.params as { projectId: string };

  let userId = 'system_gate_user';
  let role: 'user' | 'admin' = 'admin';

  if (req.user) {
    userId = req.user.userId;
    role = req.user.role;
  } else {
    const gateReq = req as GateAuthenticatedRequest;
    if (gateReq.project) {
      userId = gateReq.project.ownerId.toString();
    }
  }

  const result = await evaluateSystemTopologyGovernanceGate(userId, role, projectId);

  if (result.systemReleaseStatus !== 'PASSED') {
    res.status(412).json({
      success: false,
      error: 'SYSTEM_TOPOLOGY_GATE_BLOCKED',
      message: `System topology release gate failed for project ${projectId} with status ${result.systemReleaseStatus}`,
      data: result,
    });
    return;
  }

  sendSuccess(res, result, 200);
}
