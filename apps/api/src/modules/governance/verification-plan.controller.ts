import type { Request, Response } from 'express';

import { sendSuccess } from '../../utils/api-response.js';
import { AppError } from '../../errors/app-error.js';
import {
  UpdateTaskStatusSchema,
  BypassPlanSchema,
} from './verification-plan.schema.js';
import {
  createVerificationPlanInternal,
  getProjectVerificationPlans,
  getVerificationPlanById,
  updateVerificationTaskStatus,
  bypassVerificationPlan,
} from './verification-plan.service.js';
import { Document } from '../documents/document.model.js';

export async function generateVerificationPlanHandler(req: Request, res: Response) {
  const user = req.user!;
  const { documentId } = req.params as { documentId: string };

  const doc = await Document.findOne({ _id: documentId, isDeleted: false });
  if (!doc) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }
  if (!doc.projectId) {
    throw new AppError('Document is not assigned to a project', 400, 'NO_PROJECT_ASSIGNED');
  }

  const versionStr = `v${doc.version || 1}.0.0`;
  const plan = await createVerificationPlanInternal(
    doc.projectId.toString(),
    doc._id.toString(),
    versionStr,
    user.userId,
  );

  sendSuccess(res, plan, 200);
}

export async function getProjectVerificationPlansHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };

  const plans = await getProjectVerificationPlans(user.userId, user.role, projectId);
  sendSuccess(res, plans, 200);
}

export async function getVerificationPlanByIdHandler(req: Request, res: Response) {
  const user = req.user!;
  const { planId } = req.params as { planId: string };

  const data = await getVerificationPlanById(user.userId, user.role, planId);
  sendSuccess(res, data, 200);
}

export async function updateTaskStatusHandler(req: Request, res: Response) {
  const user = req.user!;
  const { taskId } = req.params as { taskId: string };
  const input = UpdateTaskStatusSchema.parse(req.body);

  const updatedTask = await updateVerificationTaskStatus(user.userId, user.role, taskId, input);
  sendSuccess(res, updatedTask, 200);
}

export async function bypassPlanHandler(req: Request, res: Response) {
  const user = req.user!;
  const { planId } = req.params as { planId: string };
  const input = BypassPlanSchema.parse(req.body);

  const bypassedPlan = await bypassVerificationPlan(user.userId, user.role, planId, input);
  sendSuccess(res, bypassedPlan, 200);
}
