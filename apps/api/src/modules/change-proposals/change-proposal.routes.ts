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

changeProposalRouter.use(authenticate);

// Ephemeral simulation endpoint
changeProposalRouter.post('/documents/:documentId/simulate-change', runEphemeralSimulationController);

// Project proposals CRUD & list
changeProposalRouter.post('/projects/:projectId/proposals', createProposalController);
changeProposalRouter.get('/projects/:projectId/proposals', listProjectProposalsController);

// Proposal lifecycle endpoints
changeProposalRouter.get('/proposals/:proposalId', getProposalDetailsController);
changeProposalRouter.post('/proposals/:proposalId/simulate', simulateProposalController);
changeProposalRouter.patch('/proposals/:proposalId/status', updateProposalStatusController);
changeProposalRouter.post('/proposals/:proposalId/accept', acceptProposalController);

export { changeProposalRouter };
