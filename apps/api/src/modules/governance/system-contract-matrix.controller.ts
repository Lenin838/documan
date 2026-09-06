import type { Request, Response } from 'express';
import { calculateSystemContractMatrix } from './system-contract-matrix.service.js';

export async function getSystemContractMatrixHandler(req: Request, res: Response): Promise<void> {
  const userObj = req.user as { userId?: string; _id?: { toString(): string }; role?: 'user' | 'admin' } | undefined;
  const userId = userObj?.userId || userObj?._id?.toString() || '';
  const role = userObj?.role || 'user';

  const projectId = req.query.projectId as string;
  const maxDepthQuery = req.query.maxDepth ? parseInt(req.query.maxDepth as string, 10) : undefined;

  const response = await calculateSystemContractMatrix(userId, role, projectId, maxDepthQuery);
  res.status(200).json(response);
}
