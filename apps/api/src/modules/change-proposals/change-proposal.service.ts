/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { Project } from '../projects/project.model.js';
import { Document } from '../documents/document.model.js';
import { createDocumentAudit } from '../documents/document-audit.service.js';
import { checkProjectAccess } from '../governance/work-request.service.js';
import { checkUserProjectReadAccess } from '../projects/project-topology.service.js';
import { createWorkRequestInternal } from '../governance/work-request.service.js';
import {
  DocumentChangeProposal,
  IDocumentChangeProposal,
  ProposalStatus,
  ProposalType,
} from './change-proposal.model.js';
import { runChangeProposalSimulation, type SimulationResultDTO } from './change-proposal-simulation.service.js';
import { computeSimulationStateFingerprint } from './change-proposal-fingerprint.js';
import type { CreateChangeProposalInput, UpdateProposalStatusInput } from './change-proposal.schema.js';

export async function createChangeProposal(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  data: CreateChangeProposalInput,
): Promise<IDocumentChangeProposal> {
  const project = await checkProjectAccess(userId, role, projectId);
  const projObjId = project._id;
  const targetDocObjId = new Types.ObjectId(data.targetDocumentId);

  const targetDoc = await Document.findOne({
    _id: targetDocObjId,
    projectId: projObjId,
    isDeleted: false,
  });

  if (!targetDoc) {
    throw new AppError('Target document not found in project', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Generate unique sequential proposal number (e.g. PROP-PROJ1-0001)
  const count = await DocumentChangeProposal.countDocuments({ projectId: projObjId });
  const pPrefix = project.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'PROJ';
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const pNo = `PROP-${pPrefix}-${count + 1}-${randSuffix}`;

  const proposal = await DocumentChangeProposal.create({
    proposalNumber: pNo,
    projectId: projObjId,
    targetDocumentId: targetDocObjId,
    title: data.title,
    ...(data.description ? { description: data.description } : {}),
    proposalType: data.proposalType as ProposalType,
    proposedChange: data.proposedChange as any,
    status: ProposalStatus.DRAFT,
    createdBy: new Types.ObjectId(userId),
  } as any);

  try {
    await createDocumentAudit(
      targetDocObjId.toString(),
      userId,
      'CHANGE_PROPOSAL_CREATED' as any,
      {
        proposalId: (proposal as any)._id.toString(),
        proposalNumber: (proposal as any).proposalNumber,
        proposalType: (proposal as any).proposalType,
      },
    );
  } catch {
    // Non-blocking audit failure guard
  }

  return proposal;
}

export async function simulateProposal(
  userId: string,
  role: 'user' | 'admin',
  proposalId: string,
): Promise<{ proposal: IDocumentChangeProposal; simulation: SimulationResultDTO }> {
  const proposal = await DocumentChangeProposal.findById(proposalId);
  if (!proposal) {
    throw new AppError('Change proposal not found', 404, 'PROPOSAL_NOT_FOUND');
  }

  const hasAccess = await checkUserProjectReadAccess(userId, role, proposal.projectId);
  if (!hasAccess) {
    throw new AppError('Access denied to proposal project', 403, 'FORBIDDEN');
  }

  const simulationResult = await runChangeProposalSimulation(
    userId,
    role,
    proposal.targetDocumentId,
    proposal.proposalType,
    proposal.proposedChange,
  );

  const stateFingerprint = await computeSimulationStateFingerprint(
    proposal.targetDocumentId,
    proposal.projectId,
  );

  proposal.lastSimulatedAt = simulationResult.simulatedAt;
  proposal.simulationStateFingerprint = stateFingerprint;
  proposal.lastSimulationStatus = simulationResult.simulationStatus;
  proposal.simulationResultCache = simulationResult;

  if (proposal.status === ProposalStatus.DRAFT) {
    proposal.status = ProposalStatus.SIMULATED;
  }

  await proposal.save();

  return { proposal, simulation: simulationResult };
}

export async function getProposalDetails(
  userId: string,
  role: 'user' | 'admin',
  proposalId: string,
): Promise<{
  proposal: IDocumentChangeProposal;
  isStale: boolean;
  simulation?: SimulationResultDTO | undefined;
}> {
  const proposal = await DocumentChangeProposal.findById(proposalId)
    .populate('projectId', 'name')
    .populate('targetDocumentId', 'title version status')
    .populate('createdBy', 'name email');

  if (!proposal) {
    throw new AppError('Change proposal not found', 404, 'PROPOSAL_NOT_FOUND');
  }

  const targetDocId = (proposal.targetDocumentId as any)?._id || proposal.targetDocumentId;
  const projId = (proposal.projectId as any)?._id || proposal.projectId;

  const hasAccess = await checkUserProjectReadAccess(userId, role, projId);
  if (!hasAccess) {
    throw new AppError('Access denied to proposal project', 403, 'FORBIDDEN');
  }

  // Re-evaluate state fingerprint to detect staleness
  let isStale = false;
  if (proposal.simulationStateFingerprint) {
    const currentFingerprint = await computeSimulationStateFingerprint(
      targetDocId,
      projId,
    );
    if (currentFingerprint !== proposal.simulationStateFingerprint) {
      isStale = true;
    }
  }

  return {
    proposal,
    isStale,
    simulation: proposal.simulationResultCache as SimulationResultDTO | undefined,
  };
}

export async function listProjectProposals(
  userId: string,
  role: 'user' | 'admin',
  projectId: string,
  status?: ProposalStatus,
): Promise<IDocumentChangeProposal[]> {
  const hasAccess = await checkUserProjectReadAccess(userId, role, projectId);
  if (!hasAccess) {
    throw new AppError('Access denied to project proposals', 403, 'FORBIDDEN');
  }

  const query: any = { projectId: new Types.ObjectId(projectId) };
  if (status) {
    query.status = status;
  }

  return DocumentChangeProposal.find(query)
    .populate('targetDocumentId', 'title version status')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
}

export async function updateProposalStatus(
  userId: string,
  role: 'user' | 'admin',
  proposalId: string,
  data: UpdateProposalStatusInput,
): Promise<IDocumentChangeProposal> {
  const proposal = await DocumentChangeProposal.findById(proposalId);
  if (!proposal) {
    throw new AppError('Change proposal not found', 404, 'PROPOSAL_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, proposal.projectId.toString());

  proposal.status = data.status as ProposalStatus;
  proposal.reviewedBy = new Types.ObjectId(userId);
  if (data.reviewComment) {
    proposal.reviewComment = data.reviewComment;
  }

  await proposal.save();

  let auditAction: any = 'CHANGE_PROPOSAL_SUBMITTED';
  if (data.status === 'REJECTED') auditAction = 'CHANGE_PROPOSAL_REJECTED';
  if (data.status === 'DISCARDED') auditAction = 'CHANGE_PROPOSAL_DISCARDED';

  try {
    await createDocumentAudit(
      proposal.targetDocumentId.toString(),
      userId,
      auditAction,
      {
        proposalId: proposal._id.toString(),
        proposalNumber: proposal.proposalNumber,
        newStatus: proposal.status,
        reviewComment: proposal.reviewComment,
      },
    );
  } catch {
    // Non-blocking audit failure guard
  }

  return proposal;
}

export async function acceptProposal(
  userId: string,
  role: 'user' | 'admin',
  proposalId: string,
): Promise<{
  proposal: IDocumentChangeProposal;
  handoffPayload: {
    targetDocumentId: string;
    proposedTitle?: string;
    proposedContent?: string;
    proposedContractSchema?: Record<string, any>;
    targetVersionType?: string;
    nextSteps: string;
  };
}> {
  const proposal = await DocumentChangeProposal.findById(proposalId);
  if (!proposal) {
    throw new AppError('Change proposal not found', 404, 'PROPOSAL_NOT_FOUND');
  }

  await checkProjectAccess(userId, role, proposal.projectId.toString());

  if (proposal.status === ProposalStatus.ACCEPTED) {
    throw new AppError('Proposal has already been accepted', 400, 'PROPOSAL_ALREADY_ACCEPTED');
  }

  proposal.status = ProposalStatus.ACCEPTED;
  proposal.reviewedBy = new Types.ObjectId(userId);
  await proposal.save();

  try {
    await createDocumentAudit(
      proposal.targetDocumentId.toString(),
      userId,
      'CHANGE_PROPOSAL_ACCEPTED' as any,
      {
        proposalId: proposal._id.toString(),
        proposalNumber: proposal.proposalNumber,
      },
    );
  } catch {
    // Non-blocking audit failure guard
  }

  return {
    proposal,
    handoffPayload: {
      targetDocumentId: proposal.targetDocumentId.toString(),
      ...(proposal.proposedChange.title ? { proposedTitle: proposal.proposedChange.title } : {}),
      ...(proposal.proposedChange.content ? { proposedContent: proposal.proposedChange.content } : {}),
      ...(proposal.proposedChange.contractSchema ? { proposedContractSchema: proposal.proposedChange.contractSchema } : {}),
      targetVersionType: proposal.proposedChange.targetVersionType || 'MINOR',
      nextSteps: 'Create authoritative DocumentVersion using Phase 7.4 endpoint. Upon version creation, call post-acceptance work handoff.',
    },
  };
}

export async function handlePostAcceptanceVersionCreated(
  userId: string,
  proposalId: string,
  documentVersionId: string | Types.ObjectId,
): Promise<void> {
  const proposal = await DocumentChangeProposal.findById(proposalId);
  if (!proposal || proposal.status !== ProposalStatus.ACCEPTED) {
    return;
  }

  proposal.acceptedAuthoritativeVersionId = new Types.ObjectId(documentVersionId.toString());
  await proposal.save();

  // Phase 13 Handoff: Create Work Request if predicted work items exist
  const cache = proposal.simulationResultCache as SimulationResultDTO | undefined;
  if (cache?.predictedState?.predictedWorkTasks) {
    for (const task of cache.predictedState.predictedWorkTasks) {
      try {
        await createWorkRequestInternal({
          projectId: proposal.projectId,
          documentId: proposal.targetDocumentId,
          title: task.title,
          reason: task.description,
          source: 'CHANGE_IMPACT',
          createdByUserId: userId,
        });
      } catch {
        // Non-blocking handoff failure guard
      }
    }
  }
}
