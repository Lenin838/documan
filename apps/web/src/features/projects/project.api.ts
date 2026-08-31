import { apiClient } from '../../api/client';
import type { Document } from '../documents/document.types';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from './project.types';

export async function getProjects(): Promise<{
  data: { projects: Project[] };
}> {
  const response = await apiClient.get<{
    data: { projects: Project[] };
  }>('/projects');
  return response.data;
}

export async function getProjectById(id: string): Promise<{
  data: { project: Project };
}> {
  const response = await apiClient.get<{
    data: { project: Project };
  }>(`/projects/${id}`);
  return response.data;
}

export async function createProject(input: CreateProjectInput): Promise<{
  data: { project: Project };
}> {
  const response = await apiClient.post<{
    data: { project: Project };
  }>('/projects', input);
  return response.data;
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<{
  data: { project: Project };
}> {
  const response = await apiClient.patch<{
    data: { project: Project };
  }>(`/projects/${id}`, input);
  return response.data;
}

export async function archiveProject(id: string): Promise<{
  data: { message: string };
}> {
  const response = await apiClient.delete<{
    data: { message: string };
  }>(`/projects/${id}`);
  return response.data;
}

export async function getProjectDocuments(id: string): Promise<{
  data: { documents: Document[] };
}> {
  const response = await apiClient.get<{
    data: { documents: Document[] };
  }>(`/projects/${id}/documents`);
  return response.data;
}

export async function assignDocumentToProject(
  projectId: string,
  documentId: string,
): Promise<{
  data: { message: string; documentId: string; projectId: string };
}> {
  const response = await apiClient.post<{
    data: { message: string; documentId: string; projectId: string };
  }>(`/projects/${projectId}/documents`, { documentId });
  return response.data;
}

export async function removeDocumentFromProject(
  projectId: string,
  documentId: string,
): Promise<{
  data: { message: string; documentId: string; projectId: string };
}> {
  const response = await apiClient.delete<{
    data: { message: string; documentId: string; projectId: string };
  }>(`/projects/${projectId}/documents/${documentId}`);
  return response.data;
}
