import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateUser,
  mockGetCurrentUser,
  mockUpdateCurrentUser,
  mockChangePassword,
  mockGetAllUsers,
  mockGetUserById,
  mockAdminUpdateUser,
  mockUpdateUserStatus,
  mockDeleteUser,
} = vi.hoisted(() => {
  process.env.MONGO_URI =
    'mongodb://127.0.0.1:27017/documan_test';

  process.env.JWT_SECRET =
    'test-secret-that-is-at-least-32-characters-long';

  return {
    mockCreateUser: vi.fn(),
    mockGetCurrentUser: vi.fn(),
    mockUpdateCurrentUser: vi.fn(),
    mockChangePassword: vi.fn(),
    mockGetAllUsers: vi.fn(),
    mockGetUserById: vi.fn(),
    mockAdminUpdateUser: vi.fn(),
    mockUpdateUserStatus: vi.fn(),
    mockDeleteUser: vi.fn(),
  };
});

vi.mock('./user.service.js', () => ({
  createUser: mockCreateUser,
  getCurrentUser: mockGetCurrentUser,
  updateCurrentUser: mockUpdateCurrentUser,
  changePassword: mockChangePassword,
  getAllUsers: mockGetAllUsers,
  getUserById: mockGetUserById,
  adminUpdateUser: mockAdminUpdateUser,
  updateUserStatus: mockUpdateUserStatus,
  deleteUser: mockDeleteUser,
}));

import {
  createUserController,
  getCurrentUserController,
  updateCurrentUserController,
  changePasswordController,
  getAllUsersController,
  getUserByIdController,
  adminUpdateUserController,
  updateUserStatusController,
  deleteUserController,
} from './user.controller.js';

function createMockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;

  vi.mocked(res.status).mockReturnValue(res);
  vi.mocked(res.json).mockReturnValue(res);

  return res;
}

function createMockNext() {
  return vi.fn() as unknown as NextFunction;
}

function createMockRequest(
  overrides: Partial<Request> = {},
): Request {
  return {
    ...overrides,
  } as Request;
}

const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'user@example.com',
  role: 'user' as const,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('user controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserController', () => {
    it('should create a user successfully', async () => {
      const req = createMockRequest({
        body: {
          name: 'Test User',
          email: 'user@example.com',
          password: 'password123',
        },
      });

      const res = createMockResponse();

      mockCreateUser.mockResolvedValue(mockUser);

      await createUserController(req, res);

      expect(mockCreateUser).toHaveBeenCalledWith(
        req.body,
      );

      expect(res.status).toHaveBeenCalledWith(201);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should propagate service errors', async () => {
      const req = createMockRequest({
        body: {
          name: 'Test User',
          email: 'user@example.com',
          password: 'password123',
        },
      });

      const res = createMockResponse();

      const error = new Error('User already exists');

      mockCreateUser.mockRejectedValue(error);

      await expect(
        createUserController(req, res),
      ).rejects.toBe(error);

      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentUserController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest({});
      const res = createMockResponse();
      const next = createMockNext();

      await getCurrentUserController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        }),
      );

      expect(mockGetCurrentUser).not.toHaveBeenCalled();
    });

    it('should return the current user', async () => {
      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      mockGetCurrentUser.mockResolvedValue(
        mockUser,
      );

      await getCurrentUserController(
        req,
        res,
        next,
      );

      expect(mockGetCurrentUser).toHaveBeenCalledWith(
        'user-123',
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      const error = new Error(
        'User not found',
      );

      mockGetCurrentUser.mockRejectedValue(error);

      await getCurrentUserController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateCurrentUserController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest({
        body: {
          name: 'Updated Name',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      await updateCurrentUserController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(
        mockUpdateCurrentUser,
      ).not.toHaveBeenCalled();
    });

    it('should update the current user successfully', async () => {
      const body = {
        name: 'Updated Name',
      };

      const req = createMockRequest({
        body,
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
      };

      mockUpdateCurrentUser.mockResolvedValue(
        updatedUser,
      );

      await updateCurrentUserController(
        req,
        res,
        next,
      );

      expect(
        mockUpdateCurrentUser,
      ).toHaveBeenCalledWith(
        'user-123',
        body,
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedUser,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        body: {
          name: 'Updated Name',
        },
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      const error = new Error('Update failed');

      mockUpdateCurrentUser.mockRejectedValue(
        error,
      );

      await updateCurrentUserController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('changePasswordController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest({
        body: {
          currentPassword: 'old-password',
          newPassword: 'new-password',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      await changePasswordController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(
        mockChangePassword,
      ).not.toHaveBeenCalled();
    });

    it('should change the password successfully', async () => {
      const body = {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      };

      const req = createMockRequest({
        body,
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      const result = {
        message: 'Password changed successfully',
      };

      mockChangePassword.mockResolvedValue(
        result,
      );

      await changePasswordController(
        req,
        res,
        next,
      );

      expect(mockChangePassword).toHaveBeenCalledWith(
        'user-123',
        body,
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: result,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        body: {
          currentPassword: 'old-password',
          newPassword: 'new-password',
        },
        user: {
          userId: 'user-123',
          role: 'user',
        },
      });

      const res = createMockResponse();
      const next = createMockNext();

      const error = new Error(
        'Invalid current password',
      );

      mockChangePassword.mockRejectedValue(
        error,
      );

      await changePasswordController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllUsersController', () => {
    it('should get users using the validated query', async () => {
      const validatedQuery = {
        page: 2,
        limit: 10,
        role: 'user' as const,
        isActive: true,
        search: 'john',
      };

      const req = createMockRequest();

      const res = createMockResponse();

      res.locals = {
        validatedQuery,
      };

      const next = createMockNext();

      const users = {
        users: [mockUser],
        pagination: {
          page: 2,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockGetAllUsers.mockResolvedValue(users);

      await getAllUsersController(
        req,
        res,
        next,
      );

      expect(mockGetAllUsers).toHaveBeenCalledWith(
        validatedQuery,
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: users,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const validatedQuery = {
        page: 1,
        limit: 10,
      };

      const req = createMockRequest();

      const res = createMockResponse();

      res.locals = {
        validatedQuery,
      };

      const next = createMockNext();

      const error = new Error(
        'Failed to get users',
      );

      mockGetAllUsers.mockRejectedValue(error);

      await getAllUsersController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserByIdController', () => {
    it('should get a user using the validated ID', async () => {
      const req = createMockRequest();

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-123',
        },
      };

      const next = createMockNext();

      mockGetUserById.mockResolvedValue(
        mockUser,
      );

      await getUserByIdController(
        req,
        res,
        next,
      );

      expect(mockGetUserById).toHaveBeenCalledWith(
        'user-123',
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest();

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-123',
        },
      };

      const next = createMockNext();

      const error = new Error(
        'User not found',
      );

      mockGetUserById.mockRejectedValue(error);

      await getUserByIdController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('adminUpdateUserController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest({
        body: {
          name: 'Updated Name',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-456',
        },
      };

      const next = createMockNext();

      await adminUpdateUserController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(
        mockAdminUpdateUser,
      ).not.toHaveBeenCalled();
    });

    it('should update another user successfully', async () => {
      const body = {
        name: 'Updated User',
        role: 'admin' as const,
      };

      const req = createMockRequest({
        body,
        user: {
          userId: 'admin-123',
          role: 'admin',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-456',
        },
      };

      const next = createMockNext();

      const updatedUser = {
        ...mockUser,
        id: 'user-456',
        name: 'Updated User',
        role: 'admin' as const,
      };

      mockAdminUpdateUser.mockResolvedValue(
        updatedUser,
      );

      await adminUpdateUserController(
        req,
        res,
        next,
      );

      expect(
        mockAdminUpdateUser,
      ).toHaveBeenCalledWith(
        'admin-123',
        'user-456',
        body,
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedUser,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        body: {
          name: 'Updated User',
        },
        user: {
          userId: 'admin-123',
          role: 'admin',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-456',
        },
      };

      const next = createMockNext();

      const error = new Error(
        'Admin update failed',
      );

      mockAdminUpdateUser.mockRejectedValue(
        error,
      );

      await adminUpdateUserController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUserStatusController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest({
        body: {
          isActive: false,
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-456',
        },
      };

      const next = createMockNext();

      await updateUserStatusController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(
        mockUpdateUserStatus,
      ).not.toHaveBeenCalled();
    });

    it('should update user status successfully', async () => {
      const body = {
        isActive: false,
      };

      const req = createMockRequest({
        body,
        user: {
          userId: 'admin-123',
          role: 'admin',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-456',
        },
      };

      const next = createMockNext();

      const updatedUser = {
        ...mockUser,
        id: 'user-456',
        isActive: false,
      };

      mockUpdateUserStatus.mockResolvedValue(
        updatedUser,
      );

      await updateUserStatusController(
        req,
        res,
        next,
      );

      expect(
        mockUpdateUserStatus,
      ).toHaveBeenCalledWith(
        'admin-123',
        'user-456',
        false,
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedUser,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        body: {
          isActive: false,
        },
        user: {
          userId: 'admin-123',
          role: 'admin',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-456',
        },
      };

      const next = createMockNext();

      const error = new Error(
        'Status update failed',
      );

      mockUpdateUserStatus.mockRejectedValue(
        error,
      );

      await updateUserStatusController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteUserController', () => {
    it('should reject when authentication is missing', async () => {
      const req = createMockRequest();

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-456',
        },
      };

      const next = createMockNext();

      await deleteUserController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
        }),
      );

      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it('should delete another user successfully', async () => {
      const req = createMockRequest({
        user: {
          userId: 'admin-123',
          role: 'admin',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-456',
        },
      };

      const next = createMockNext();

      const result = {
        message: 'User deleted successfully',
      };

      mockDeleteUser.mockResolvedValue(result);

      await deleteUserController(
        req,
        res,
        next,
      );

      expect(mockDeleteUser).toHaveBeenCalledWith(
        'admin-123',
        'user-456',
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: result,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it('should pass service errors to next', async () => {
      const req = createMockRequest({
        user: {
          userId: 'admin-123',
          role: 'admin',
        },
      });

      const res = createMockResponse();

      res.locals = {
        validatedParams: {
          id: 'user-456',
        },
      };

      const next = createMockNext();

      const error = new Error(
        'Delete failed',
      );

      mockDeleteUser.mockRejectedValue(error);

      await deleteUserController(
        req,
        res,
        next,
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});