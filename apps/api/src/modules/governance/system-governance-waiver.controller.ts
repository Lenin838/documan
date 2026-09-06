import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import {
  grantSystemGovernanceWaiver,
  revokeSystemGovernanceWaiver,
  listSystemGovernanceWaivers,
} from './system-governance-waiver.service.js';

export async function grantWaiverHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { projectId } = req.params as { projectId: string };

    const waiver = await grantSystemGovernanceWaiver(user.userId, user.role, projectId, req.body);

    sendSuccess(res, waiver, 201);
  } catch (error) {
    next(error);
  }
}

export async function listWaiversHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { projectId } = req.params as { projectId: string };
    const includeExpired = req.query.includeExpired === 'true';
    const includeRevoked = req.query.includeRevoked === 'true';

    const waivers = await listSystemGovernanceWaivers(user.userId, user.role, projectId, {
      includeExpired,
      includeRevoked,
    });

    sendSuccess(res, waivers, 200);
  } catch (error) {
    next(error);
  }
}

export async function revokeWaiverHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user!;
    const { projectId, waiverId } = req.params as { projectId: string; waiverId: string };
    const reason = req.body?.reason;

    const waiver = await revokeSystemGovernanceWaiver(user.userId, user.role, projectId, waiverId, reason);

    sendSuccess(res, waiver, 200);
  } catch (error) {
    next(error);
  }
}
