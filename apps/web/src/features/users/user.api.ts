import { apiClient } from '../../api/client';

import type {
  DeleteUserResponse,
  GetUserResponse,
  GetUsersParams,
  GetUsersResponse,
  UpdateUserRequest,
  UpdateUserStatusRequest,
} from './user.types';

export async function getUsers(
  params: GetUsersParams = {},
): Promise<GetUsersResponse> {
  const response = await apiClient.get<GetUsersResponse>(
    '/users',
    {
      params,
    },
  );

  return response.data;
}

export async function getUserById(
  userId: string,
): Promise<GetUserResponse> {
  const response = await apiClient.get<GetUserResponse>(
    `/users/${userId}`,
  );

  return response.data;
}

export async function updateUser(
  userId: string,
  data: UpdateUserRequest,
): Promise<GetUserResponse> {
  const response = await apiClient.patch<GetUserResponse>(
    `/users/${userId}`,
    data,
  );

  return response.data;
}

export async function updateUserStatus(
  userId: string,
  data: UpdateUserStatusRequest,
): Promise<GetUserResponse> {
  const response = await apiClient.patch<GetUserResponse>(
    `/users/${userId}/status`,
    data,
  );

  return response.data;
}

export async function deleteUser(
  userId: string,
): Promise<DeleteUserResponse> {
  const response =
    await apiClient.delete<DeleteUserResponse>(
      `/users/${userId}`,
    );

  return response.data;
}