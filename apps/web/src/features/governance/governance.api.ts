import axios from 'axios';
import type {
  ProjectGovernanceResponse,
  GovernanceEvaluationResult,
  ConfirmFreshnessResponse,
  ProjectGovernanceSettings,
  ProjectReleaseGateSettings,
  CreateGateTokenResponse,
  ProjectGateToken,
} from './governance.types';

const API_URL = '/api/v1';

export async function getProjectGovernance(
  projectId: string,
): Promise<ProjectGovernanceResponse> {
  const res = await axios.get<{ success: boolean; data: ProjectGovernanceResponse }>(
    `${API_URL}/projects/${projectId}/governance`,
  );
  return res.data.data;
}

export async function updateProjectGovernance(
  projectId: string,
  data: Partial<ProjectGovernanceSettings> & {
    releaseGateSettings?: Partial<ProjectReleaseGateSettings>;
  },
): Promise<ProjectGovernanceResponse> {
  const res = await axios.patch<{ success: boolean; data: ProjectGovernanceResponse }>(
    `${API_URL}/projects/${projectId}/governance`,
    data,
  );
  return res.data.data;
}

export async function evaluateProjectGovernance(
  projectId: string,
): Promise<GovernanceEvaluationResult> {
  const res = await axios.post<{ success: boolean; data: GovernanceEvaluationResult }>(
    `${API_URL}/projects/${projectId}/governance/evaluate`,
  );
  return res.data.data;
}

export async function confirmDocumentFreshness(
  documentId: string,
): Promise<ConfirmFreshnessResponse> {
  const res = await axios.post<{ success: boolean; data: ConfirmFreshnessResponse }>(
    `${API_URL}/documents/${documentId}/confirm-freshness`,
  );
  return res.data.data;
}

export async function createGateToken(
  projectId: string,
  payload: { name: string; expiresInDays?: number },
): Promise<CreateGateTokenResponse> {
  const res = await axios.post<{ success: boolean; data: CreateGateTokenResponse }>(
    `${API_URL}/projects/${projectId}/governance/gate-tokens`,
    payload,
  );
  return res.data.data;
}

export async function getGateTokens(
  projectId: string,
): Promise<ProjectGateToken[]> {
  const res = await axios.get<{ success: boolean; data: { gateTokens: ProjectGateToken[] } }>(
    `${API_URL}/projects/${projectId}/governance/gate-tokens`,
  );
  return res.data.data.gateTokens;
}

export async function revokeGateToken(
  projectId: string,
  tokenId: string,
): Promise<{ id: string; name: string; revokedAt: string }> {
  const res = await axios.delete<{ success: boolean; data: { id: string; name: string; revokedAt: string } }>(
    `${API_URL}/projects/${projectId}/governance/gate-tokens/${tokenId}`,
  );
  return res.data.data;
}
