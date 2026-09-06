import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../../errors/app-error.js';
import { calculateSystemBaselineAlignment } from './system-baseline-alignment.service.js';

export async function getSystemBaselineAlignmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');
    }

    const rawProjectId = req.params.projectId;
    const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] || '' : String(rawProjectId || '');
    if (!projectId) {
      throw new AppError('Project ID is required', 400, 'PROJECT_ID_REQUIRED');
    }

    const userId = user.userId || (user as { id?: string }).id || '';
    const role = (user.role as 'user' | 'admin') || 'user';

    const result = await calculateSystemBaselineAlignment(userId, role, projectId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
