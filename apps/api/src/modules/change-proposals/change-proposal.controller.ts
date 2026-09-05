/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type { Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  createChangeProposalSchema,
  simulateChangeSchema,
  updateProposalStatusSchema,
} from './change-proposal.schema.js';
import { runChangeProposalSimulation } from './change-proposal-simulation.service.js';
import {
  createChangeProposal,
  simulateProposal,
  getProposalDetails,
  listProjectProposals,
  updateProposalStatus,
  acceptProposal,
} from './change-proposal.service.js';

export async function runEphemeralSimulationController(
  req: any,
  res: Response,
): Promise<void> {
  const documentId = req.params.documentId;
  const input = simulateChangeSchema.parse(req.body);

  const simulation = await runChangeProposalSimulation(
    req.user!.id,
    req.user!.role,
    documentId,
    input.proposalType as any,
    input.proposedChange as any,
  );

  res.status(200).json({
    success: true,
    data: simulation,
  });
}

export async function createProposalController(
  req: any,
  res: Response,
): Promise<void> {
  const projectId = req.params.projectId;
  const input = createChangeProposalSchema.parse(req.body);

  const proposal = await createChangeProposal(
    req.user!.id,
    req.user!.role,
    projectId,
    input,
  );

  res.status(201).json({
    success: true,
    data: proposal,
  });
}

export async function listProjectProposalsController(
  req: any,
  res: Response,
): Promise<void> {
  const projectId = req.params.projectId;
  const status = req.query.status as any;

  const proposals = await listProjectProposals(
    req.user!.id,
    req.user!.role,
    projectId,
    status,
  );

  res.status(200).json({
    success: true,
    data: proposals,
  });
}

export async function getProposalDetailsController(
  req: any,
  res: Response,
): Promise<void> {
  const proposalId = req.params.proposalId;

  const result = await getProposalDetails(
    req.user!.id,
    req.user!.role,
    proposalId,
  );

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function simulateProposalController(
  req: any,
  res: Response,
): Promise<void> {
  const proposalId = req.params.proposalId;

  const result = await simulateProposal(
    req.user!.id,
    req.user!.role,
    proposalId,
  );

  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function updateProposalStatusController(
  req: any,
  res: Response,
): Promise<void> {
  const proposalId = req.params.proposalId;
  const input = updateProposalStatusSchema.parse(req.body);

  const proposal = await updateProposalStatus(
    req.user!.id,
    req.user!.role,
    proposalId,
    input,
  );

  res.status(200).json({
    success: true,
    data: proposal,
  });
}

export async function acceptProposalController(
  req: any,
  res: Response,
): Promise<void> {
  const proposalId = req.params.proposalId;

  const result = await acceptProposal(
    req.user!.id,
    req.user!.role,
    proposalId,
  );

  res.status(200).json({
    success: true,
    data: result,
  });
}
