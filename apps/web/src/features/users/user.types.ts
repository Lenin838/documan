export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export interface GetUsersResponse {
  success: boolean;
  data: {
    users: User[];
    pagination: UsersPagination;
  };
}

export interface GetUserResponse {
  success: boolean;
  data: User;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
}

export interface DeleteUserResponse {
  success: boolean;
  data: {
    message: string;
  };
}