import { apiClient } from "../../api/client";

import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ResendOtpRequest,
  ResendOtpResponse,
  RefreshResponse,
  CurrentUserResponse,
} from "./auth.types";

export async function register(
  userData: RegisterRequest,
): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>(
    "/auth/register",
    userData,
  );

  return response.data;
}

export async function verifyOtp(
  payload: VerifyOtpRequest,
): Promise<VerifyOtpResponse> {
  const response = await apiClient.post<VerifyOtpResponse>(
    "/auth/register/verify-otp",
    payload,
  );

  return response.data;
}

export async function resendOtp(
  payload: ResendOtpRequest,
): Promise<ResendOtpResponse> {
  const response = await apiClient.post<ResendOtpResponse>(
    "/auth/register/resend-otp",
    payload,
  );

  return response.data;
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    "/auth/login",
    credentials,
  );

  return response.data;
}

export async function refreshAccessToken(): Promise<RefreshResponse> {
  const response = await apiClient.post<RefreshResponse>("/auth/refresh");

  return response.data;
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const response = await apiClient.get<CurrentUserResponse>("/users/me");

  return response.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function logoutAll(): Promise<void> {
  await apiClient.post("/auth/logout-all");
}
