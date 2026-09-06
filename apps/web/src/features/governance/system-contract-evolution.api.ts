import type { ContractEvolutionDeltaResponseDTO } from './system-contract-evolution.types';

export async function fetchContractEvolutionDelta(
  providerProjectId: string,
  providerDocumentId: string,
  baselineIdA: string,
  baselineIdB: string,
  token: string,
): Promise<ContractEvolutionDeltaResponseDTO> {
  const params = new URLSearchParams({
    providerProjectId,
    providerDocumentId,
    baselineIdA,
    baselineIdB,
  });

  const response = await fetch(`/api/v1/governance/system-governance/contract-evolution/delta?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || payload.message || 'Failed to fetch contract evolution delta');
  }

  return payload.data;
}
