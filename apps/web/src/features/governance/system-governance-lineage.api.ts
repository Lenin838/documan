import { apiClient } from '../../api/client';
import type {
  HistoricalSystemGateResult,
  SystemGovernanceTimelineResult,
  SystemGovernanceStateDiff,
} from './system-governance-lineage.types';

export async function fetchHistoricalSystemGate(
  projectId: string,
  atTimestamp: string,
): Promise<HistoricalSystemGateResult> {
  const response = await apiClient.get<{ data: HistoricalSystemGateResult }>(
    '/governance/system-topology/historical-gate',
    {
      params: { projectId, at: atTimestamp },
    },
  );
  return response.data.data;
}

export async function fetchSystemGovernanceTimeline(
  projectId: string,
  from?: string,
  to?: string,
  limit: number = 50,
): Promise<SystemGovernanceTimelineResult> {
  const response = await apiClient.get<{ data: SystemGovernanceTimelineResult }>(
    '/governance/system-topology/lineage',
    {
      params: { projectId, from, to, limit },
    },
  );
  return response.data.data;
}

export async function fetchGovernanceStateDiff(
  projectId: string,
  t1: string,
  t2: string,
): Promise<SystemGovernanceStateDiff> {
  const response = await apiClient.get<{ data: SystemGovernanceStateDiff }>(
    '/governance/system-topology/lineage-diff',
    {
      params: { projectId, t1, t2 },
    },
  );
  return response.data.data;
}
