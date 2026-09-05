/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from '../../api/client';
import type {
  DocumentChangeProposal,
  ProposalStatus,
  ProposalType,
  ProposedChangePayload,
  SimulationResult,
} from './change-proposal.types';

export async function runEphemeralSimulation(
  documentId: string,
  proposalType: ProposalType,
  proposedChange: ProposedChangePayload,
): Promise<SimulationResult> {
  const response = await apiClient.post<{ success: boolean; data: SimulationResult }>(
    `/documents/${documentId}/simulate-change`,
    {
      proposalType,
      proposedChange,
    },
  );
  return response.data.data;
}

export async function createChangeProposal(
  projectId: string,
  targetDocumentId: string,
  title: string,
  proposalType: ProposalType,
  proposedChange: ProposedChangePayload,
  description?: string,
): Promise<DocumentChangeProposal> {
  const response = await apiClient.post<{ success: boolean; data: DocumentChangeProposal }>(
    `/projects/${projectId}/proposals`,
    {
      targetDocumentId,
      title,
      proposalType,
      proposedChange,
      description,
    },
  );
  return response.data.data;
}

export async function listProjectProposals(
  projectId: string,
  status?: ProposalStatus,
): Promise<DocumentChangeProposal[]> {
  const response = await apiClient.get<{ success: boolean; data: DocumentChangeProposal[] }>(
    `/projects/${projectId}/proposals`,
    {
      params: status ? { status } : undefined,
    },
  );
  return response.data.data;
}

export async function getProposalDetails(proposalId: string): Promise<{
  proposal: DocumentChangeProposal;
  isStale: boolean;
  simulation?: SimulationResult;
}> {
  const response = await apiClient.get<{
    success: boolean;
    data: {
      proposal: DocumentChangeProposal;
      isStale: boolean;
      simulation?: SimulationResult;
    };
  }>(`/proposals/${proposalId}`);
  return response.data.data;
}

export async function simulateProposal(proposalId: string): Promise<{
  proposal: DocumentChangeProposal;
  simulation: SimulationResult;
}> {
  const response = await apiClient.post<{
    success: boolean;
    data: { proposal: DocumentChangeProposal; simulation: SimulationResult };
  }>(`/proposals/${proposalId}/simulate`);
  return response.data.data;
}

export async function updateProposalStatus(
  proposalId: string,
  status: 'UNDER_REVIEW' | 'REJECTED' | 'DISCARDED',
  reviewComment?: string,
): Promise<DocumentChangeProposal> {
  const response = await apiClient.patch<{ success: boolean; data: DocumentChangeProposal }>(
    `/proposals/${proposalId}/status`,
    { status, reviewComment },
  );
  return response.data.data;
}

export async function acceptProposal(proposalId: string): Promise<{
  proposal: DocumentChangeProposal;
  handoffPayload: {
    targetDocumentId: string;
    proposedTitle?: string;
    proposedContent?: string;
    proposedContractSchema?: Record<string, any>;
    targetVersionType?: string;
    nextSteps: string;
  };
}> {
  const response = await apiClient.post<{
    success: boolean;
    data: {
      proposal: DocumentChangeProposal;
      handoffPayload: {
        targetDocumentId: string;
        proposedTitle?: string;
        proposedContent?: string;
        proposedContractSchema?: Record<string, any>;
        targetVersionType?: string;
        nextSteps: string;
      };
    };
  }>(`/proposals/${proposalId}/accept`);
  return response.data.data;
}
