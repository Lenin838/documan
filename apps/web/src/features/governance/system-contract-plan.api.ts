import axios from 'axios';
import type {
  SystemContractPlanResponseDTO,
  ContractChangePlanRequestDTO,
} from './system-contract-plan.types';

export async function generateContractChangePlan(
  projectId: string,
  options?: ContractChangePlanRequestDTO,
): Promise<{ success: boolean; data: SystemContractPlanResponseDTO }> {
  const response = await axios.post<{ success: boolean; data: SystemContractPlanResponseDTO }>(
    `/api/v1/projects/${projectId}/contract-change-plan`,
    options || {},
  );
  return response.data;
}
