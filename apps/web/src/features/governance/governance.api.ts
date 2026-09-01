import axios from 'axios';
import type {
  ProjectGovernanceResponse,
  GovernanceEvaluationResult,
  ConfirmFreshnessResponse,
  ProjectGovernanceSettings,
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
  data: Partial<ProjectGovernanceSettings>,
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
