import { apiClient } from '../../api/client';

import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  CurrentUserResponse,
} from './auth.types';

export async function login(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    '/auth/login',
    credentials,
  );

  return response.data;
}

export async function refreshAccessToken(): Promise<RefreshResponse> {
  const response = await apiClient.post<RefreshResponse>(
    '/auth/refresh',
  );

  return response.data;
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response = await apiClient.get<CurrentUserResponse>(
    '/users/me',
  );

  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function logoutAll(): Promise<void> {
  await apiClient.post('/auth/logout-all');
}