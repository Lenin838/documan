import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  runEphemeralSimulationController,
  createProposalController,
  listProjectProposalsController,
  getProposalDetailsController,
  simulateProposalController,
  updateProposalStatusController,
  acceptProposalController,
} from './change-proposal.controller.js';

const changeProposalRouter = Router();

// Ephemeral simulation endpoint
changeProposalRouter.post('/documents/:documentId/simulate-change', authenticate, runEphemeralSimulationController);

// Project proposals CRUD & list
changeProposalRouter.post('/projects/:projectId/proposals', authenticate, createProposalController);
changeProposalRouter.get('/projects/:projectId/proposals', authenticate, listProjectProposalsController);

// Proposal lifecycle endpoints
changeProposalRouter.get('/proposals/:proposalId', authenticate, getProposalDetailsController);
changeProposalRouter.post('/proposals/:proposalId/simulate', authenticate, simulateProposalController);
changeProposalRouter.patch('/proposals/:proposalId/status', authenticate, updateProposalStatusController);
changeProposalRouter.post('/proposals/:proposalId/accept', authenticate, acceptProposalController);

export { changeProposalRouter };
