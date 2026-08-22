import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockUser,
  mockRefreshToken,
  mockBcrypt,
} = vi.hoisted(() => {
  process.env.MONGO_URI =
    'mongodb://127.0.0.1:27017/documan_test';

  process.env.JWT_SECRET =
    'test-secret-that-is-at-least-32-characters-long';

  return {
    mockUser: {
      findOne: vi.fn(),
      findById: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
      create: vi.fn(),
    },

    mockRefreshToken: {
      updateMany: vi.fn(),
    },

    mockBcrypt: {
      hash: vi.fn(),
      compare: vi.fn(),
    },
  };
});

vi.mock('./user.model.js', () => ({
  User: mockUser,
}));

vi.mock('../auth/refresh-token.model.js', () => ({
  RefreshToken: mockRefreshToken,
}));

vi.mock('bcrypt', () => ({
  default: mockBcrypt,
}));

import {
  createUser,
  getCurrentUser,
  updateCurrentUser,
  changePassword,
  getAllUsers,
  getUserById,
  adminUpdateUser,
  updateUserStatus,
  deleteUser,
} from './user.service.js';

function createUserDocument(
  overrides: Record<string, unknown> = {},
) {
  return {
    _id: {
      toString: () => 'user-123',
    },
    name: 'Test User',
    email: 'user@example.com',
    passwordHash: 'hashed-password',
    role: 'user' as const,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('user service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should reject when a user with the email already exists', async () => {
      mockUser.findOne.mockResolvedValue(
        createUserDocument(),
      );

      await expect(
        createUser({
          name: 'Test User',
          email: 'user@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'USER_ALREADY_EXISTS',
      });

      expect(mockUser.findOne).toHaveBeenCalledWith({
        email: 'user@example.com',
      });

      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(mockUser.create).not.toHaveBeenCalled();
    });

    it('should create a user successfully', async () => {
      mockUser.findOne.mockResolvedValue(null);

      mockBcrypt.hash.mockResolvedValue(
        'hashed-password',
      );

      const user = createUserDocument({
        name: 'New User',
        email: 'new@example.com',
        role: 'user',
      });

      mockUser.create.mockResolvedValue(user);

      const result = await createUser({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith(
        'password123',
        12,
      );

      expect(mockUser.create).toHaveBeenCalledWith({
        name: 'New User',
        email: 'new@example.com',
        passwordHash: 'hashed-password',
      });

      expect(result).toEqual({
        id: 'user-123',
        name: 'New User',
        email: 'new@example.com',
        role: 'user',
        isActive: true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user', async () => {
      const user = createUserDocument();

      const select = vi.fn().mockResolvedValue(user);

      mockUser.findById.mockReturnValue({
        select,
      });

      const result = await getCurrentUser(
        'user-123',
      );

      expect(mockUser.findById).toHaveBeenCalledWith(
        'user-123',
      );

      expect(select).toHaveBeenCalledWith(
        'name email role isActive createdAt updatedAt',
      );

      expect(result).toEqual({
        id: 'user-123',
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });

    it('should reject when the user does not exist', async () => {
      const select = vi.fn().mockResolvedValue(null);

      mockUser.findById.mockReturnValue({
        select,
      });

      await expect(
        getCurrentUser('missing-user'),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });
  });

  describe('updateCurrentUser', () => {
    it('should update the current user name', async () => {
      const user = createUserDocument({
        name: 'Updated User',
      });

      const select = vi.fn().mockResolvedValue(user);

      mockUser.findByIdAndUpdate.mockReturnValue({
        select,
      });

      const result = await updateCurrentUser(
        'user-123',
        {
          name: 'Updated User',
        },
      );

      expect(
        mockUser.findByIdAndUpdate,
      ).toHaveBeenCalledWith(
        'user-123',
        {
          $set: {
            name: 'Updated User',
          },
        },
        {
          new: true,
          runValidators: true,
        },
      );

      expect(result).toEqual({
        id: 'user-123',
        name: 'Updated User',
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });

    it('should reject when the user does not exist', async () => {
      const select = vi.fn().mockResolvedValue(null);

      mockUser.findByIdAndUpdate.mockReturnValue({
        select,
      });

      await expect(
        updateCurrentUser('missing-user', {
          name: 'Updated User',
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });
  });

  describe('changePassword', () => {
    it('should reject when the user does not exist', async () => {
      mockUser.findById.mockResolvedValue(null);

      await expect(
        changePassword('missing-user', {
          currentPassword: 'old-password',
          newPassword: 'new-password',
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });

      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should reject when the current password is incorrect', async () => {
      const user = createUserDocument();

      mockUser.findById.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(
        changePassword('user-123', {
          currentPassword: 'wrong-password',
          newPassword: 'new-password',
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CURRENT_PASSWORD',
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'wrong-password',
        'hashed-password',
      );

      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(user.save).not.toHaveBeenCalled();
      expect(
        mockRefreshToken.updateMany,
      ).not.toHaveBeenCalled();
    });

    it('should change the password and revoke active refresh tokens', async () => {
      const user = createUserDocument();

      mockUser.findById.mockResolvedValue(user);
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue(
        'new-hashed-password',
      );

      mockRefreshToken.updateMany.mockResolvedValue({
        modifiedCount: 2,
      });

      const result = await changePassword(
        'user-123',
        {
          currentPassword: 'old-password',
          newPassword: 'new-password',
        },
      );

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'old-password',
        'hashed-password',
      );

      expect(mockBcrypt.hash).toHaveBeenCalledWith(
        'new-password',
        12,
      );

      expect(user.passwordHash).toBe(
        'new-hashed-password',
      );

      expect(user.save).toHaveBeenCalled();

      expect(
        mockRefreshToken.updateMany,
      ).toHaveBeenCalledWith(
        {
          userId: user._id,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: expect.any(Date),
          },
        },
      );

      expect(result).toEqual({
        message: 'Password changed successfully',
      });
    });
  });

  describe('getAllUsers', () => {
    function createFindChain(users: unknown[]) {
      const limit = vi.fn().mockResolvedValue(users);
      const skip = vi.fn().mockReturnValue({
        limit,
      });
      const sort = vi.fn().mockReturnValue({
        skip,
      });
      const select = vi.fn().mockReturnValue({
        sort,
      });

      mockUser.find.mockReturnValue({
        select,
      });

      return {
        select,
        sort,
        skip,
        limit,
      };
    }

    it('should return paginated users without filters', async () => {
      const users = [
        createUserDocument(),
        createUserDocument({
          _id: {
            toString: () => 'user-456',
          },
          name: 'Second User',
          email: 'second@example.com',
        }),
      ];

      const chain = createFindChain(users);

      mockUser.countDocuments.mockResolvedValue(25);

      const result = await getAllUsers({
        page: 2,
        limit: 10,
      });

      expect(mockUser.find).toHaveBeenCalledWith({});

      expect(chain.select).toHaveBeenCalledWith(
        'name email role isActive createdAt updatedAt',
      );

      expect(chain.sort).toHaveBeenCalledWith({
        createdAt: -1,
      });

      expect(chain.skip).toHaveBeenCalledWith(10);
      expect(chain.limit).toHaveBeenCalledWith(10);

      expect(
        mockUser.countDocuments,
      ).toHaveBeenCalledWith({});

      expect(result.users).toHaveLength(2);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('should filter users by role', async () => {
      createFindChain([]);

      mockUser.countDocuments.mockResolvedValue(0);

      await getAllUsers({
        page: 1,
        limit: 10,
        role: 'admin',
      });

      expect(mockUser.find).toHaveBeenCalledWith({
        role: 'admin',
      });

      expect(
        mockUser.countDocuments,
      ).toHaveBeenCalledWith({
        role: 'admin',
      });
    });

    it('should filter users by active status', async () => {
      createFindChain([]);

      mockUser.countDocuments.mockResolvedValue(0);

      await getAllUsers({
        page: 1,
        limit: 10,
        isActive: false,
      });

      expect(mockUser.find).toHaveBeenCalledWith({
        isActive: false,
      });

      expect(
        mockUser.countDocuments,
      ).toHaveBeenCalledWith({
        isActive: false,
      });
    });

    it('should search users by name and email', async () => {
      createFindChain([]);

      mockUser.countDocuments.mockResolvedValue(0);

      await getAllUsers({
        page: 1,
        limit: 10,
        search: 'john',
      });

      expect(mockUser.find).toHaveBeenCalledWith({
        $or: [
          {
            name: {
              $regex: 'john',
              $options: 'i',
            },
          },
          {
            email: {
              $regex: 'john',
              $options: 'i',
            },
          },
        ],
      });
    });

    it('should combine role, status, and search filters', async () => {
      createFindChain([]);

      mockUser.countDocuments.mockResolvedValue(0);

      await getAllUsers({
        page: 2,
        limit: 5,
        role: 'user',
        isActive: true,
        search: 'alice',
      });

      expect(mockUser.find).toHaveBeenCalledWith({
        role: 'user',
        isActive: true,
        $or: [
          {
            name: {
              $regex: 'alice',
              $options: 'i',
            },
          },
          {
            email: {
              $regex: 'alice',
              $options: 'i',
            },
          },
        ],
      });
    });
  });

  describe('getUserById', () => {
    it('should return a user by ID', async () => {
      const user = createUserDocument();

      const select = vi.fn().mockResolvedValue(user);

      mockUser.findById.mockReturnValue({
        select,
      });

      const result = await getUserById(
        'user-123',
      );

      expect(mockUser.findById).toHaveBeenCalledWith(
        'user-123',
      );

      expect(result).toEqual({
        id: 'user-123',
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });

    it('should reject when the user does not exist', async () => {
      const select = vi.fn().mockResolvedValue(null);

      mockUser.findById.mockReturnValue({
        select,
      });

      await expect(
        getUserById('missing-user'),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });
  });

  describe('adminUpdateUser', () => {
    it('should update user name, email, and role', async () => {
      const user = createUserDocument({
        name: 'Old Name',
        email: 'old@example.com',
        role: 'user',
      });

      mockUser.findById.mockResolvedValue(user);
      mockUser.findOne.mockResolvedValue(null);

      const result = await adminUpdateUser(
        'admin-123',
        'user-123',
        {
          name: 'New Name',
          email: 'new@example.com',
          role: 'admin',
        },
      );

      expect(mockUser.findById).toHaveBeenCalledWith(
        'user-123',
      );

      expect(mockUser.findOne).toHaveBeenCalledWith({
        email: 'new@example.com',
        _id: {
          $ne: user._id,
        },
      });

      expect(user.name).toBe('New Name');
      expect(user.email).toBe('new@example.com');
      expect(user.role).toBe('admin');

      expect(user.save).toHaveBeenCalled();

      expect(result).toEqual({
        id: 'user-123',
        name: 'New Name',
        email: 'new@example.com',
        role: 'admin',
        isActive: true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });

    it('should update only the provided fields', async () => {
      const user = createUserDocument({
        name: 'Existing Name',
        email: 'existing@example.com',
        role: 'user',
      });

      mockUser.findById.mockResolvedValue(user);

      const result = await adminUpdateUser(
        'admin-123',
        'user-123',
        {
          name: 'Updated Name',
        },
      );

      expect(user.name).toBe('Updated Name');
      expect(user.email).toBe(
        'existing@example.com',
      );
      expect(user.role).toBe('user');

      expect(mockUser.findOne).not.toHaveBeenCalled();
      expect(user.save).toHaveBeenCalled();

      expect(result.name).toBe('Updated Name');
    });

    it('should reject when the user does not exist', async () => {
      mockUser.findById.mockResolvedValue(null);

      await expect(
        adminUpdateUser(
          'admin-123',
          'missing-user',
          {
            name: 'Updated Name',
          },
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });

    it('should reject self modification', async () => {
      const user = createUserDocument();

      mockUser.findById.mockResolvedValue(user);

      await expect(
        adminUpdateUser(
          'user-123',
          'user-123',
          {
            name: 'Updated Name',
          },
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'SELF_MODIFICATION_NOT_ALLOWED',
      });

      expect(user.save).not.toHaveBeenCalled();
    });

    it('should reject when the new email already belongs to another user', async () => {
      const user = createUserDocument({
        email: 'old@example.com',
      });

      mockUser.findById.mockResolvedValue(user);

      mockUser.findOne.mockResolvedValue(
        createUserDocument({
          _id: {
            toString: () => 'other-user',
          },
          email: 'new@example.com',
        }),
      );

      await expect(
        adminUpdateUser(
          'admin-123',
          'user-123',
          {
            email: 'new@example.com',
          },
        ),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'USER_ALREADY_EXISTS',
      });

      expect(user.save).not.toHaveBeenCalled();
    });

    it('should allow keeping the same email', async () => {
      const user = createUserDocument({
        email: 'same@example.com',
      });

      mockUser.findById.mockResolvedValue(user);

      await adminUpdateUser(
        'admin-123',
        'user-123',
        {
          email: 'same@example.com',
        },
      );

      expect(mockUser.findOne).not.toHaveBeenCalled();
      expect(user.save).toHaveBeenCalled();
    });
  });

  describe('updateUserStatus', () => {
    it('should activate an inactive user', async () => {
      const user = createUserDocument({
        isActive: false,
      });

      mockUser.findById.mockResolvedValue(user);

      const result = await updateUserStatus(
        'admin-123',
        'user-123',
        true,
      );

      expect(user.isActive).toBe(true);
      expect(user.save).toHaveBeenCalled();

      expect(
        mockRefreshToken.updateMany,
      ).not.toHaveBeenCalled();

      expect(result.isActive).toBe(true);
    });

    it('should deactivate an active user and revoke refresh tokens', async () => {
      const user = createUserDocument({
        isActive: true,
      });

      mockUser.findById.mockResolvedValue(user);

      mockRefreshToken.updateMany.mockResolvedValue({
        modifiedCount: 2,
      });

      const result = await updateUserStatus(
        'admin-123',
        'user-123',
        false,
      );

      expect(user.isActive).toBe(false);
      expect(user.save).toHaveBeenCalled();

      expect(
        mockRefreshToken.updateMany,
      ).toHaveBeenCalledWith(
        {
          userId: user._id,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: expect.any(Date),
          },
        },
      );

      expect(result.isActive).toBe(false);
    });

    it('should reject when the user does not exist', async () => {
      mockUser.findById.mockResolvedValue(null);

      await expect(
        updateUserStatus(
          'admin-123',
          'missing-user',
          false,
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });

    it('should reject self modification', async () => {
      const user = createUserDocument();

      mockUser.findById.mockResolvedValue(user);

      await expect(
        updateUserStatus(
          'user-123',
          'user-123',
          false,
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'SELF_MODIFICATION_NOT_ALLOWED',
      });

      expect(user.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should soft delete an active user and revoke refresh tokens', async () => {
      const user = createUserDocument({
        isActive: true,
      });

      mockUser.findById.mockResolvedValue(user);

      mockRefreshToken.updateMany.mockResolvedValue({
        modifiedCount: 2,
      });

      const result = await deleteUser(
        'admin-123',
        'user-123',
      );

      expect(user.isActive).toBe(false);
      expect(user.save).toHaveBeenCalled();

      expect(
        mockRefreshToken.updateMany,
      ).toHaveBeenCalledWith(
        {
          userId: user._id,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: expect.any(Date),
          },
        },
      );

      expect(result).toEqual({
        message: 'User deleted successfully',
      });
    });

    it('should reject when the user does not exist', async () => {
      mockUser.findById.mockResolvedValue(null);

      await expect(
        deleteUser(
          'admin-123',
          'missing-user',
        ),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    });

    it('should reject self deletion', async () => {
      const user = createUserDocument();

      mockUser.findById.mockResolvedValue(user);

      await expect(
        deleteUser(
          'user-123',
          'user-123',
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'SELF_DELETION_NOT_ALLOWED',
      });

      expect(user.save).not.toHaveBeenCalled();
    });

    it('should reject an already inactive user', async () => {
      const user = createUserDocument({
        isActive: false,
      });

      mockUser.findById.mockResolvedValue(user);

      await expect(
        deleteUser(
          'admin-123',
          'user-123',
        ),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'USER_ALREADY_INACTIVE',
      });

      expect(user.save).not.toHaveBeenCalled();
      expect(
        mockRefreshToken.updateMany,
      ).not.toHaveBeenCalled();
    });
  });
});