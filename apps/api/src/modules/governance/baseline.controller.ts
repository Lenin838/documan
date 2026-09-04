import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../errors/app-error.js';
import { CreateBaselineSchema } from './baseline.schema.js';
import {
  createBaseline,
  getProjectBaselines,
  getBaselineById,
  archiveBaseline,
} from './baseline.service.js';
import { calculateProjectBaselineDrift } from './drift-calculator.service.js';
import { createVerificationPlanInternal } from './verification-plan.service.js';
import { verifyProjectOwnerOrAdmin, getProjectGovernance } from './governance.service.js';

export async function createBaselineHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = req.user;
    const projectId = String(req.params.projectId);
    if (!user || !projectId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    await verifyProjectOwnerOrAdmin(projectId, user.userId, user.role);

    const parseResult = CreateBaselineSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      throw new AppError(
        firstIssue?.message || 'Validation error',
        400,
        'VALIDATION_ERROR',
      );
    }

    const baseline = await createBaseline(
      projectId,
      {
        name: parseResult.data.name,
        versionTag: parseResult.data.versionTag,
        description: parseResult.data.description,
      },
      user.userId,
    );
    return res.status(201).json({
      status: 'success',
      data: baseline,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getProjectBaselinesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = req.user;
    const projectId = String(req.params.projectId);
    if (!user || !projectId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    await getProjectGovernance(user.userId, user.role, projectId);

    const baselines = await getProjectBaselines(projectId);
    return res.json({
      status: 'success',
      data: baselines,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getBaselineByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = req.user;
    const projectId = String(req.params.projectId);
    const baselineId = String(req.params.baselineId);
    if (!user || !projectId || !baselineId) {
      throw new AppError('Unauthorized or missing parameters', 401, 'UNAUTHORIZED');
    }

    await getProjectGovernance(user.userId, user.role, projectId);

    const baseline = await getBaselineById(projectId, baselineId);
    return res.json({
      status: 'success',
      data: baseline,
    });
  } catch (error) {
    return next(error);
  }
}

export async function compareBaselineHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = req.user;
    const projectId = String(req.params.projectId);
    const baselineId = req.params.baselineId ? String(req.params.baselineId) : undefined;
    if (!user || !projectId) {
      throw new AppError('Unauthorized or missing parameters', 401, 'UNAUTHORIZED');
    }

    await getProjectGovernance(user.userId, user.role, projectId);

    const driftReport = await calculateProjectBaselineDrift(projectId, baselineId);
    return res.json({
      status: 'success',
      data: driftReport,
    });
  } catch (error) {
    return next(error);
  }
}

export async function archiveBaselineHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = req.user;
    const projectId = String(req.params.projectId);
    const baselineId = String(req.params.baselineId);
    if (!user || !projectId || !baselineId) {
      throw new AppError('Unauthorized or missing parameters', 401, 'UNAUTHORIZED');
    }

    await verifyProjectOwnerOrAdmin(projectId, user.userId, user.role);

    const archived = await archiveBaseline(projectId, baselineId, user.userId);
    return res.json({
      status: 'success',
      data: archived,
    });
  } catch (error) {
    return next(error);
  }
}

export async function triggerDriftVerificationPlanHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = req.user;
    const projectId = String(req.params.projectId);
    const { triggerDocumentId, triggerVersion } = req.body;
    if (!user || !projectId || !triggerDocumentId || !triggerVersion) {
      throw new AppError('Missing required trigger plan parameters', 400, 'BAD_REQUEST');
    }

    await verifyProjectOwnerOrAdmin(projectId, user.userId, user.role);

    // Call exact Phase 11 4-argument internal signature: (projectId, triggerDocumentId, triggerVersionStr, userId)
    const plan = await createVerificationPlanInternal(
      projectId,
      triggerDocumentId,
      String(triggerVersion),
      user.userId,
    );

    return res.status(201).json({
      status: 'success',
      data: plan,
    });
  } catch (error) {
    return next(error);
  }
}
