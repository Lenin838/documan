import type { Request, Response } from 'express';

import { sendSuccess } from '../../utils/api-response.js';
import {
  updateGovernanceSettingsSchema,
  createGateTokenSchema,
  gateCheckMetadataSchema,
} from './governance.schema.js';
import {
  getProjectGovernance,
  updateProjectGovernance,
  confirmDocumentFreshness,
  createProjectGateToken,
  getProjectGateTokens,
  revokeProjectGateToken,
} from './governance.service.js';
import { evaluateProjectGovernanceInternal } from './governance-evaluator.service.js';
import { evaluateReleaseGateInternal } from './release-gate-evaluator.service.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';

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

export async function createProjectGateTokenHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };
  const input = createGateTokenSchema.parse(req.body);

  const tokenData = await createProjectGateToken(user.userId, user.role, projectId, input);
  sendSuccess(res, tokenData, 201);
}

export async function getProjectGateTokensHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId } = req.params as { projectId: string };

  const tokens = await getProjectGateTokens(user.userId, user.role, projectId);
  sendSuccess(res, { gateTokens: tokens }, 200);
}

export async function revokeProjectGateTokenHandler(req: Request, res: Response) {
  const user = req.user!;
  const { projectId, tokenId } = req.params as { projectId: string; tokenId: string };

  const result = await revokeProjectGateToken(user.userId, user.role, projectId, tokenId);
  sendSuccess(res, result, 200);
}

export async function gateCheckHandler(req: Request, res: Response) {
  const { projectId } = req.params as { projectId: string };
  const metadataInput = gateCheckMetadataSchema.parse(req.body || {});

  const result = await evaluateReleaseGateInternal(projectId);

  if (!result.passed) {
    // Log audit record ONLY for BLOCKED gate check to prevent noise on successful polls
    const firstBlock = result.blockingDocuments[0];
    const gateReq = req as Request & { gateTokenId?: string };
    if (firstBlock && firstBlock.id && firstBlock.id.length === 24) {
      await createDocumentAudit(firstBlock.id, gateReq.gateTokenId || '', 'STATUS_CHANGE', {
        action: 'DOCUMENT_GATE_BLOCKED',
        projectId,
        reason: firstBlock.reason,
        summary: result.summary,
        metadata: metadataInput,
      }).catch(() => {
        // Ignore audit logging errors in CI response
      });
    }

    res.status(412).json({
      success: false,
      error: 'DOCUMENTATION_GATE_BLOCKED',
      message: `Documentation release gate blocked for project ${projectId}`,
      data: result,
    });
    return;
  }

  sendSuccess(res, result, 200);
}
