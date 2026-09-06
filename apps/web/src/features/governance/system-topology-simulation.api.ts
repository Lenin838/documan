import { apiClient } from '../../api/client';
import type {
  SystemTopologySimulationScenarioInput,
  SystemTopologySimulationResponse,
} from './system-topology-simulation.types';

export async function simulateSystemTopologyGate(
  projectId: string,
  scenario: SystemTopologySimulationScenarioInput,
): Promise<{ data: SystemTopologySimulationResponse }> {
  const response = await apiClient.post<{ data: SystemTopologySimulationResponse }>(
    `/projects/${projectId}/system-topology-gate/simulate`,
    scenario,
  );
  return response.data;
}
