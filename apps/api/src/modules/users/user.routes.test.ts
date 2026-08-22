import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateUserController,
  mockGetCurrentUserController,
  mockUpdateCurrentUserController,
  mockChangePasswordController,
  mockGetAllUsersController,
  mockGetUserByIdController,
  mockAdminUpdateUserController,
  mockUpdateUserStatusController,
  mockDeleteUserController,
} = vi.hoisted(() => ({
  mockCreateUserController: vi.fn((_req, res) => {
    return res.status(201).json({
      success: true,
      data: 'create-user',
    });
  }),

  mockGetCurrentUserController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'current-user',
    });
  }),

  mockUpdateCurrentUserController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'updated-user',
    });
  }),

  mockChangePasswordController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'password-changed',
    });
  }),

  mockGetAllUsersController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'all-users',
    });
  }),

  mockGetUserByIdController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'user-by-id',
    });
  }),

  mockAdminUpdateUserController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'admin-updated-user',
    });
  }),

  mockUpdateUserStatusController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'status-updated',
    });
  }),

  mockDeleteUserController: vi.fn((_req, res) => {
    return res.status(200).json({
      success: true,
      data: 'user-deleted',
    });
  }),
}));

vi.mock('./user.controller.js', () => ({
  createUserController: mockCreateUserController,
  getCurrentUserController: mockGetCurrentUserController,
  updateCurrentUserController:
    mockUpdateCurrentUserController,
  changePasswordController:
    mockChangePasswordController,
  getAllUsersController: mockGetAllUsersController,
  getUserByIdController: mockGetUserByIdController,
  adminUpdateUserController:
    mockAdminUpdateUserController,
  updateUserStatusController:
    mockUpdateUserStatusController,
  deleteUserController: mockDeleteUserController,
}));

vi.mock('../../middleware/auth.middleware.js', () => ({
  authenticate: vi.fn((req, _res, next) => {
    req.user = {
      userId: 'user-123',
      role: 'admin',
    };

    next();
  }),
}));

vi.mock(
  '../../middleware/authorization.middleware.js',
  () => ({
    requireRole: vi.fn(
      (...allowedRoles: ('user' | 'admin')[]) =>
        (req: express.Request, _res: express.Response, next: express.NextFunction) => {
          if (
            !req.user ||
            !allowedRoles.includes(req.user.role)
          ) {
            return next(
              new Error('Forbidden'),
            );
          }

          next();
        },
    ),
  }),
);

import { userRouter } from './user.routes.js';

function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/users', userRouter);

  return app;
}

describe('user routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /users', () => {
    it('should create a user', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);

      expect(
        mockCreateUserController,
      ).toHaveBeenCalledTimes(1);
    });

    it('should validate the request body', async () => {
      const app = createApp();

      const response = await request(app)
        .post('/users')
        .send({
          name: 'J',
          email: 'invalid-email',
          password: 'short',
        });

      expect(response.status).toBe(400);

      expect(
        mockCreateUserController,
      ).not.toHaveBeenCalled();
    });
  });

  describe('GET /users', () => {
    it('should allow an authenticated admin', async () => {
      const app = createApp();

      const response = await request(app)
        .get('/users')
        .query({
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);

      expect(
        mockGetAllUsersController,
      ).toHaveBeenCalledTimes(1);
    });

    it('should validate the query parameters', async () => {
      const app = createApp();

      const response = await request(app)
        .get('/users')
        .query({
          page: 0,
          limit: 101,
        });

      expect(response.status).toBe(400);

      expect(
        mockGetAllUsersController,
      ).not.toHaveBeenCalled();
    });
  });

  describe('GET /users/me', () => {
    it('should get the current user', async () => {
      const app = createApp();

      const response = await request(app)
        .get('/users/me');

      expect(response.status).toBe(200);

      expect(
        mockGetCurrentUserController,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /users/me', () => {
    it('should update the current user', async () => {
      const app = createApp();

      const response = await request(app)
        .patch('/users/me')
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(200);

      expect(
        mockUpdateCurrentUserController,
      ).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid body data', async () => {
      const app = createApp();

      const response = await request(app)
        .patch('/users/me')
        .send({
          name: 'A',
        });

      expect(response.status).toBe(400);

      expect(
        mockUpdateCurrentUserController,
      ).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /users/me/password', () => {
    it('should change the current user password', async () => {
      const app = createApp();

      const response = await request(app)
        .patch('/users/me/password')
        .send({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
        });

      expect(response.status).toBe(200);

      expect(
        mockChangePasswordController,
      ).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid password data', async () => {
      const app = createApp();

      const response = await request(app)
        .patch('/users/me/password')
        .send({
          currentPassword: 'short',
          newPassword: 'short',
        });

      expect(response.status).toBe(400);

      expect(
        mockChangePasswordController,
      ).not.toHaveBeenCalled();
    });
  });

  describe('GET /users/:id', () => {
    it('should get a user by ID', async () => {
      const app = createApp();

      const response = await request(app)
        .get(
          '/users/507f1f77bcf86cd799439011',
        );

      expect(response.status).toBe(200);

      expect(
        mockGetUserByIdController,
      ).toHaveBeenCalledTimes(1);
    });

    it('should reject an invalid user ID', async () => {
      const app = createApp();

      const response = await request(app)
        .get('/users/not-a-valid-id');

      expect(response.status).toBe(400);

      expect(
        mockGetUserByIdController,
      ).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update a user as an admin', async () => {
      const app = createApp();

      const response = await request(app)
        .patch(
          '/users/507f1f77bcf86cd799439011',
        )
        .send({
          name: 'Updated User',
        });

      expect(response.status).toBe(200);

      expect(
        mockAdminUpdateUserController,
      ).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid params', async () => {
      const app = createApp();

      const response = await request(app)
        .patch('/users/not-valid')
        .send({
          name: 'Updated User',
        });

      expect(response.status).toBe(400);

      expect(
        mockAdminUpdateUserController,
      ).not.toHaveBeenCalled();
    });

    it('should reject invalid body', async () => {
      const app = createApp();

      const response = await request(app)
        .patch(
          '/users/507f1f77bcf86cd799439011',
        )
        .send({
          invalidField: 'value',
        });

      expect(response.status).toBe(400);

      expect(
        mockAdminUpdateUserController,
      ).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /users/:id/status', () => {
    it('should update user status as an admin', async () => {
      const app = createApp();

      const response = await request(app)
        .patch(
          '/users/507f1f77bcf86cd799439011/status',
        )
        .send({
          isActive: false,
        });

      expect(response.status).toBe(200);

      expect(
        mockUpdateUserStatusController,
      ).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid status body', async () => {
      const app = createApp();

      const response = await request(app)
        .patch(
          '/users/507f1f77bcf86cd799439011/status',
        )
        .send({
          isActive: 'false',
        });

      expect(response.status).toBe(400);

      expect(
        mockUpdateUserStatusController,
      ).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user as an admin', async () => {
      const app = createApp();

      const response = await request(app)
        .delete(
          '/users/507f1f77bcf86cd799439011',
        );

      expect(response.status).toBe(200);

      expect(
        mockDeleteUserController,
      ).toHaveBeenCalledTimes(1);
    });

    it('should reject an invalid user ID', async () => {
      const app = createApp();

      const response = await request(app)
        .delete('/users/not-valid');

      expect(response.status).toBe(400);

      expect(
        mockDeleteUserController,
      ).not.toHaveBeenCalled();
    });
  });

  describe('route ordering', () => {
    it('should resolve /me before /:id', async () => {
      const app = createApp();

      await request(app).get('/users/me');

      expect(
        mockGetCurrentUserController,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockGetUserByIdController,
      ).not.toHaveBeenCalled();
    });
  });
});