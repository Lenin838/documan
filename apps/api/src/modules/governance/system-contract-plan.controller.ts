import type { Request, Response, NextFunction } from 'express';
import { generateSystemContractChangePlan } from './system-contract-plan.service.js';
import type { ContractChangePlanRequestDTO } from './system-contract-plan.types.js';

export async function postContractChangePlanHandler(
  req: Request<{ projectId: string }, unknown, ContractChangePlanRequestDTO>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userObj = req.user as { id?: string; userId?: string; _id?: { toString(): string } } | undefined;
    const userId = userObj?.id || userObj?.userId || userObj?._id?.toString() || '';
    const { projectId } = req.params;
    const options = req.body;

    const result = await generateSystemContractChangePlan(userId, projectId, options);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
