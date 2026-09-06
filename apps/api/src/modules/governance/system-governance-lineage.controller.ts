import { Request, Response, NextFunction } from 'express';

import {
  evaluateSystemGateAt,
  generateSystemGovernanceTimeline,
  calculateGovernanceStateDiff,
} from './system-governance-lineage.service.js';

export async function getHistoricalSystemGateHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const projectId = req.query.projectId as string;
    const at = req.query.at as string;

    const result = await evaluateSystemGateAt(userId, role, projectId, at);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSystemGovernanceTimelineHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const projectId = req.query.projectId as string;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const result = await generateSystemGovernanceTimeline(userId, role, projectId, from, to, limitParam);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSystemGovernanceLineageDiffHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const projectId = req.query.projectId as string;
    const t1 = req.query.t1 as string;
    const t2 = req.query.t2 as string;

    const result = await calculateGovernanceStateDiff(userId, role, projectId, t1, t2);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
