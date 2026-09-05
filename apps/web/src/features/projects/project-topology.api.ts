import { apiClient } from '../../api/client';

export type ProjectTopologyType =
  | 'DEPENDS_ON'
  | 'PROVIDES_API_TO'
  | 'INTEGRATES_WITH'
  | 'SHARED_LIBRARY';

export interface ProjectTopologyLinkItem {
  _id: string;
  sourceProjectId: {
    _id: string;
    name: string;
    description?: string;
    isArchived: boolean;
  };
  targetProjectId: {
    _id: string;
    name: string;
    description?: string;
    isArchived: boolean;
  };
  type: ProjectTopologyType;
  description?: string | null;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ArchitectureNode {
  id: string;
  name: string;
  isCurrentProject: boolean;
}

export interface ArchitectureEdge {
  id: string;
  sourceProjectId: string;
  targetProjectId: string;
  type: ProjectTopologyType;
  contractCount: number;
  hasActiveDrift: boolean;
}

export interface ArchitectureGraphResponse {
  projectId: string;
  evaluatedAt: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export async function getProjectTopologyLinks(projectId: string): Promise<{
  data: { links: ProjectTopologyLinkItem[] };
}> {
  const response = await apiClient.get<{
    data: { links: ProjectTopologyLinkItem[] };
  }>(`/projects/${projectId}/topology`);
  return response.data;
}

export async function createProjectTopologyLink(
  projectId: string,
  input: { targetProjectId: string; type: ProjectTopologyType; description?: string | null },
): Promise<{
  data: ProjectTopologyLinkItem;
}> {
  const response = await apiClient.post<{
    data: ProjectTopologyLinkItem;
  }>(`/projects/${projectId}/topology`, input);
  return response.data;
}

export async function updateProjectTopologyLink(
  projectId: string,
  linkId: string,
  input: { type?: ProjectTopologyType; description?: string | null },
): Promise<{
  data: ProjectTopologyLinkItem;
}> {
  const response = await apiClient.patch<{
    data: ProjectTopologyLinkItem;
  }>(`/projects/${projectId}/topology/${linkId}`, input);
  return response.data;
}

export async function deleteProjectTopologyLink(
  projectId: string,
  linkId: string,
): Promise<{
  data: { success: boolean; message: string };
}> {
  const response = await apiClient.delete<{
    data: { success: boolean; message: string };
  }>(`/projects/${projectId}/topology/${linkId}`);
  return response.data;
}

export async function getProjectArchitectureGraph(projectId: string): Promise<{
  data: ArchitectureGraphResponse;
}> {
  const response = await apiClient.get<{
    data: ArchitectureGraphResponse;
  }>(`/projects/${projectId}/architecture-graph`);
  return response.data;
}
