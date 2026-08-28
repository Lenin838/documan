import { apiClient } from '../../api/client';
import type {
  CreateFolderParams,
  DeleteFolderResponse,
  GetFolderResponse,
  GetFoldersResponse,
  UpdateFolderParams,
} from './folder.types';

export async function getFolders(): Promise<GetFoldersResponse> {
  const response = await apiClient.get<GetFoldersResponse>('/folders');
  return response.data;
}

export async function getFolderById(
  folderId: string,
): Promise<GetFolderResponse> {
  const response = await apiClient.get<GetFolderResponse>(
    `/folders/${folderId}`,
  );
  return response.data;
}

export async function createFolder(
  params: CreateFolderParams,
): Promise<GetFolderResponse> {
  const response = await apiClient.post<GetFolderResponse>(
    '/folders',
    params,
  );
  return response.data;
}

export async function updateFolder(
  folderId: string,
  params: UpdateFolderParams,
): Promise<GetFolderResponse> {
  const response = await apiClient.patch<GetFolderResponse>(
    `/folders/${folderId}`,
    params,
  );
  return response.data;
}

export async function deleteFolder(
  folderId: string,
): Promise<DeleteFolderResponse> {
  const response = await apiClient.delete<DeleteFolderResponse>(
    `/folders/${folderId}`,
  );
  return response.data;
}
