export type UserRole = "user" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    user: AuthUser;
  };
}

export interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
  };
}

export interface CurrentUserResponse {
  success: boolean;
  data: AuthUser;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export type RegisterResponse = LoginResponse;

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export type VerifyOtpResponse = LoginResponse;

export interface ResendOtpRequest {
  email: string;
}

export interface ResendOtpResponse {
  success: boolean;
  data: {
    message: string;
    resendCooldown: number;
    devOtpCode?: string;
  };
}
