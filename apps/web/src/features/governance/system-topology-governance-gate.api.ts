import { apiClient } from '../../api/client';
import type { SystemGovernanceGateResponse } from './system-topology-governance-gate.types';

export async function getSystemGovernanceGate(projectId: string): Promise<{ data: SystemGovernanceGateResponse }> {
  const response = await apiClient.get<{ data: SystemGovernanceGateResponse }>(
    `/projects/${projectId}/system-governance-gate`,
  );
  return response.data;
}

export async function checkSystemReleaseGate(projectId: string): Promise<{ data: SystemGovernanceGateResponse }> {
  const response = await apiClient.post<{ data: SystemGovernanceGateResponse }>(
    `/projects/${projectId}/system-governance-gate/gate-check`,
  );
  return response.data;
}
