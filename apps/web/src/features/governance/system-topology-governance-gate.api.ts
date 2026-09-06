import { apiClient } from '../../api/client';
import type {
  SystemGovernanceGateResponse,
  SystemGovernanceWaiverDTO,
  SystemBlockerType,
} from './system-topology-governance-gate.types';

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

export interface GrantWaiverPayload {
  targetProviderProjectId: string;
  targetDocumentId?: string | null;
  contractVersionNumber?: number | null;
  blockerType: SystemBlockerType;
  reason: string;
  expiresInDays?: number;
}

export async function grantSystemGovernanceWaiver(
  projectId: string,
  payload: GrantWaiverPayload,
): Promise<{ data: SystemGovernanceWaiverDTO }> {
  const response = await apiClient.post<{ data: SystemGovernanceWaiverDTO }>(
    `/projects/${projectId}/system-governance-waivers`,
    payload,
  );
  return response.data;
}

export async function listSystemGovernanceWaivers(
  projectId: string,
  includeExpired = false,
  includeRevoked = false,
): Promise<{ data: SystemGovernanceWaiverDTO[] }> {
  const response = await apiClient.get<{ data: SystemGovernanceWaiverDTO[] }>(
    `/projects/${projectId}/system-governance-waivers`,
    { params: { includeExpired, includeRevoked } },
  );
  return response.data;
}

export async function revokeSystemGovernanceWaiver(
  projectId: string,
  waiverId: string,
  reason?: string,
): Promise<{ data: SystemGovernanceWaiverDTO }> {
  const response = await apiClient.patch<{ data: SystemGovernanceWaiverDTO }>(
    `/projects/${projectId}/system-governance-waivers/${waiverId}/revoke`,
    { reason },
  );
  return response.data;
}
