import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../../errors/app-error.js';
import { calculateContractEvolutionDelta } from './system-contract-evolution.service.js';

export async function getContractEvolutionDeltaController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role || 'user';

    if (!userId) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { providerProjectId, providerDocumentId, baselineIdA, baselineIdB } = req.query;

    if (!providerProjectId || typeof providerProjectId !== 'string') {
      throw new AppError('Query parameter providerProjectId is required', 400, 'VALIDATION_ERROR');
    }

    if (!providerDocumentId || typeof providerDocumentId !== 'string') {
      throw new AppError('Query parameter providerDocumentId is required', 400, 'VALIDATION_ERROR');
    }

    if (!baselineIdA || typeof baselineIdA !== 'string') {
      throw new AppError('Query parameter baselineIdA is required', 400, 'VALIDATION_ERROR');
    }

    if (!baselineIdB || typeof baselineIdB !== 'string') {
      throw new AppError('Query parameter baselineIdB is required', 400, 'VALIDATION_ERROR');
    }

    const result = await calculateContractEvolutionDelta(
      userId,
      role,
      providerProjectId,
      providerDocumentId,
      baselineIdA,
      baselineIdB,
    );

    res.status(200).json({
      success: true,
      message: 'Contract evolution delta calculated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
