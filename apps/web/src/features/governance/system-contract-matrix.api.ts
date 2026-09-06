import type { SystemContractMatrixResponseDTO } from './system-contract-matrix.types';

const API_BASE = '/api/v1/governance';

export async function getSystemContractMatrix(
  projectId: string,
  maxDepth?: number,
): Promise<{ data: SystemContractMatrixResponseDTO }> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const queryParams = new URLSearchParams({ projectId });
  if (maxDepth !== undefined) {
    queryParams.append('maxDepth', maxDepth.toString());
  }

  const res = await fetch(`${API_BASE}/system-contract-matrix?${queryParams.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: 'Failed to fetch matrix' }));
    throw new Error(errorBody.message || 'Failed to fetch contract matrix');
  }

  const data = (await res.json()) as SystemContractMatrixResponseDTO;
  return { data };
}
