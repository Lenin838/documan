/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from '../../api/client';
import type {
  DocumentChangePackage,
  PackageSimulationResultDTO,
  PackageStalenessResult,
  PackageStatus,
} from './change-package.types';

export async function createChangePackage(
  projectId: string,
  title: string,
  description?: string,
  proposalIds?: string[],
): Promise<DocumentChangePackage> {
  const response = await apiClient.post<{ success: boolean; data: DocumentChangePackage }>(
    `/projects/${projectId}/change-packages`,
    { title, description, proposalIds },
  );
  return response.data.data;
}

export async function listProjectChangePackages(projectId: string): Promise<DocumentChangePackage[]> {
  const response = await apiClient.get<{ success: boolean; data: DocumentChangePackage[] }>(
    `/projects/${projectId}/change-packages`,
  );
  return response.data.data;
}

export async function getChangePackageDetails(packageId: string): Promise<{
  package: DocumentChangePackage;
  staleness: PackageStalenessResult;
}> {
  const response = await apiClient.get<{
    success: boolean;
    data: DocumentChangePackage;
    staleness: PackageStalenessResult;
  }>(`/change-packages/${packageId}`);
  return {
    package: response.data.data,
    staleness: response.data.staleness,
  };
}

export async function addProposalToPackage(
  packageId: string,
  proposalId: string,
): Promise<DocumentChangePackage> {
  const response = await apiClient.post<{ success: boolean; data: DocumentChangePackage }>(
    `/change-packages/${packageId}/proposals`,
    { proposalId },
  );
  return response.data.data;
}

export async function removeProposalFromPackage(
  packageId: string,
  proposalId: string,
): Promise<DocumentChangePackage> {
  const response = await apiClient.delete<{ success: boolean; data: DocumentChangePackage }>(
    `/change-packages/${packageId}/proposals/${proposalId}`,
  );
  return response.data.data;
}

export async function simulateChangePackage(packageId: string): Promise<{
  package: DocumentChangePackage;
  simulation: PackageSimulationResultDTO;
}> {
  const response = await apiClient.post<{
    success: boolean;
    data: PackageSimulationResultDTO;
    package: DocumentChangePackage;
  }>(`/change-packages/${packageId}/simulate`);
  return {
    package: response.data.package,
    simulation: response.data.data,
  };
}

export async function updatePackageStatus(
  packageId: string,
  status: PackageStatus,
  reviewComment?: string,
): Promise<DocumentChangePackage> {
  const response = await apiClient.patch<{ success: boolean; data: DocumentChangePackage }>(
    `/change-packages/${packageId}/status`,
    { status, reviewComment },
  );
  return response.data.data;
}

export async function acceptChangePackage(packageId: string): Promise<{
  package: DocumentChangePackage;
  handoffPayload: {
    message: string;
    nextSteps: string;
    acceptedProposals: Array<{
      proposalId: string;
      targetDocumentId: string;
      proposalType: string;
    }>;
  };
}> {
  const response = await apiClient.post<{
    success: boolean;
    data: DocumentChangePackage;
    handoffPayload: any;
  }>(`/change-packages/${packageId}/accept`);
  return {
    package: response.data.data,
    handoffPayload: response.data.handoffPayload,
  };
}
