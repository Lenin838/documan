import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

import { useAuthStore } from '../features/auth/auth.store';
import type { RefreshResponse } from '../features/auth/auth.types';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = axios
    .post<RefreshResponse>(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
      },
    )
    .then((response) => {
      const accessToken = response.data.data.accessToken;

      useAuthStore.setState({
        accessToken,
        isAuthenticated: true,
      });

      return accessToken;
    })
    .catch(() => {
      useAuthStore.getState().clearAuth();

      return null;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken =
      useAuthStore.getState().accessToken;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/logout')
    ) {
      return Promise.reject(error);
    }

    if ((originalRequest as InternalAxiosRequestConfig & {
      _retry?: boolean;
    })._retry) {
      useAuthStore.getState().clearAuth();

      return Promise.reject(error);
    }

    (
      originalRequest as InternalAxiosRequestConfig & {
        _retry?: boolean;
      }
    )._retry = true;

    const newAccessToken = await refreshAccessToken();

    if (!newAccessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization =
      `Bearer ${newAccessToken}`;

    return apiClient(originalRequest);
  },
);