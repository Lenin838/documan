import axios from 'axios';

import type {
  DocumentationBaseline,
  DriftReport,
} from './baseline.types';

const API_URL = '/api/v1';

export async function createBaseline(
  projectId: string,
  payload: { name: string; versionTag: string; description?: string },
): Promise<DocumentationBaseline> {
  const res = await axios.post<{ status: string; data: DocumentationBaseline }>(
    `${API_URL}/projects/${projectId}/baselines`,
    payload,
  );
  return res.data.data;
}

export async function getProjectBaselines(
  projectId: string,
): Promise<DocumentationBaseline[]> {
  const res = await axios.get<{ status: string; data: DocumentationBaseline[] }>(
    `${API_URL}/projects/${projectId}/baselines`,
  );
  return res.data.data;
}

export async function getBaselineById(
  projectId: string,
  baselineId: string,
): Promise<DocumentationBaseline> {
  const res = await axios.get<{ status: string; data: DocumentationBaseline }>(
    `${API_URL}/projects/${projectId}/baselines/${baselineId}`,
  );
  return res.data.data;
}

export async function compareBaseline(
  projectId: string,
  baselineId?: string,
): Promise<DriftReport> {
  const url = baselineId
    ? `${API_URL}/projects/${projectId}/baselines/${baselineId}/compare`
    : `${API_URL}/projects/${projectId}/baselines/active/compare`;
  const res = await axios.get<{ status: string; data: DriftReport }>(url);
  return res.data.data;
}

export async function archiveBaseline(
  projectId: string,
  baselineId: string,
): Promise<DocumentationBaseline> {
  const res = await axios.post<{ status: string; data: DocumentationBaseline }>(
    `${API_URL}/projects/${projectId}/baselines/${baselineId}/archive`,
  );
  return res.data.data;
}

export async function triggerDriftVerificationPlan(
  projectId: string,
  triggerDocumentId: string,
  triggerVersion: number | string,
): Promise<unknown> {
  const res = await axios.post<{ status: string; data: unknown }>(
    `${API_URL}/projects/${projectId}/baselines/trigger-verification-plan`,
    { triggerDocumentId, triggerVersion },
  );
  return res.data.data;
}
