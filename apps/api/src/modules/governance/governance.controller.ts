import type { Request, Response } from 'express';

import { sendSuccess } from '../../utils/api-response.js';
import { updateGovernanceSettingsSchema } from './governance.schema.js';
import {
  getProjectGovernance,
  updateProjectGovernance,
  confirmDocumentFreshness,
} from './governance.service.js';
import { evaluateProjectGovernanceInternal } from './governance-evaluator.service.js';

export async function getProjectGovernanceHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };

  const data = await getProjectGovernance(user.userId, user.role, projectId);
  sendSuccess(res, data, 200);
}

export async function updateProjectGovernanceHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };
  const input = updateGovernanceSettingsSchema.parse(req.body);

  const data = await updateProjectGovernance(user.userId, user.role, projectId, input);
  sendSuccess(res, data, 200);
}

export async function evaluateProjectGovernanceHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };

  // Verify Owner or Admin authority before manual evaluation
  await getProjectGovernance(user.userId, user.role, projectId);

  const result = await evaluateProjectGovernanceInternal(projectId);
  sendSuccess(res, result, 200);
}

export async function confirmDocumentFreshnessHandler(req: Request, res: Response) {
  const user = req.user!;
  const { id: documentId } = req.params as { id: string };

  const result = await confirmDocumentFreshness(user.userId, user.role, documentId);
  sendSuccess(res, result, 200);
}
