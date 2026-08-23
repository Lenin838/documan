import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { User } from './user.model.js';
import { RefreshToken } from '../auth/refresh-token.model.js';

import bcrypt from 'bcrypt';

vi.mock('./user.model.js', () => ({
  User: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../auth/refresh-token.model.js', () => ({
  RefreshToken: {
    updateMany: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

const mockUser = User as unknown as {
  findOne: ReturnType<typeof vi.fn>;
  findOneAndUpdate: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  countDocuments: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

const mockRefreshToken = RefreshToken as unknown as {
  updateMany: ReturnType<typeof vi.fn>;
};

const mockBcrypt = bcrypt as unknown as {
  hash: ReturnType<typeof vi.fn>;
  compare: ReturnType<typeof vi.fn>;
};

function createUserDocument(
  overrides: Record<string, unknown> = {},
) {
  return {
    _id: {
      toString: () => 'user-123',
    },
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'user' as const,
    isActive: true,
    isDeleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    save: vi.fn(),
    ...overrides,
  };
}

function createSelectMock(value: unknown) {
  const select = vi.fn().mockResolvedValue(value);

  return {
    select,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createUser', () => {
  it('should create a user successfully', async () => {
    mockUser.findOne.mockResolvedValue(null);

    mockBcrypt.hash.mockResolvedValue(
      'hashed-password',
    );

    const user = createUserDocument();

    mockUser.create.mockResolvedValue(user);

    const result = await createUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });

    expect(mockUser.findOne).toHaveBeenCalledWith({
      email: 'test@example.com',
    });

    expect(mockBcrypt.hash).toHaveBeenCalledWith(
      'password123',
      12,
    );

    expect(mockUser.create).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
    });

    expect(result).toEqual({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      isActive: true,
      isDeleted: false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  it('should reject duplicate email', async () => {
    mockUser.findOne.mockResolvedValue(
      createUserDocument(),
    );

    await expect(
      createUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'USER_ALREADY_EXISTS',
    });

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(mockUser.create).not.toHaveBeenCalled();
  });
});

describe('getCurrentUser', () => {
  it('should return the current user', async () => {
    const user = createUserDocument();

    const query = createSelectMock(user);

    mockUser.findOne.mockReturnValue(query);

    const result = await getCurrentUser('user-123');

    expect(mockUser.findOne).toHaveBeenCalledWith({
      _id: 'user-123',
      isDeleted: false,
    });

    expect(query.select).toHaveBeenCalledWith(
      'name email role isActive isDeleted createdAt updatedAt',
    );

    expect(result).toEqual({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      isActive: true,
      isDeleted: false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  it('should throw when user does not exist', async () => {
    const query = createSelectMock(null);

    mockUser.findOne.mockReturnValue(query);

    await expect(
      getCurrentUser('user-123'),
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

    const query = createSelectMock(user);

    mockUser.findOneAndUpdate.mockReturnValue(query);

    const result = await updateCurrentUser(
      'user-123',
      {
        name: 'Updated User',
      },
    );

    expect(mockUser.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: 'user-123',
        isDeleted: false,
      },
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

    expect(query.select).toHaveBeenCalledWith(
      'name email role isActive isDeleted createdAt updatedAt',
    );

    expect(result.name).toBe('Updated User');
    expect(result.isDeleted).toBe(false);
  });

  it('should throw when user does not exist', async () => {
    const query = createSelectMock(null);

    mockUser.findOneAndUpdate.mockReturnValue(query);

    await expect(
      updateCurrentUser('user-123', {
        name: 'Updated User',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});

describe('changePassword', () => {
  it('should change password successfully', async () => {
    const user = createUserDocument();

    mockUser.findOne.mockResolvedValue(user);

    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue(
      'new-hashed-password',
    );

    user.save.mockResolvedValue(user);

    mockRefreshToken.updateMany.mockResolvedValue({
      modifiedCount: 1,
    });

    const result = await changePassword(
      'user-123',
      {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword',
      },
    );

    expect(mockUser.findOne).toHaveBeenCalledWith({
      _id: 'user-123',
      isDeleted: false,
    });

    expect(mockBcrypt.compare).toHaveBeenCalledWith(
      'oldPassword',
      'hashed-password',
    );

    expect(mockBcrypt.hash).toHaveBeenCalledWith(
      'newPassword',
      12,
    );

    expect(user.passwordHash).toBe(
      'new-hashed-password',
    );

    expect(user.save).toHaveBeenCalled();

    expect(mockRefreshToken.updateMany).toHaveBeenCalled();

    expect(result).toEqual({
      message: 'Password changed successfully',
    });
  });

  it('should reject incorrect current password', async () => {
    const user = createUserDocument();

    mockUser.findOne.mockResolvedValue(user);

    mockBcrypt.compare.mockResolvedValue(false);

    await expect(
      changePassword('user-123', {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CURRENT_PASSWORD',
    });

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
    expect(user.save).not.toHaveBeenCalled();
  });
});

describe('getAllUsers', () => {
  function setupFind(users: unknown[]) {
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
      sort,
      skip,
      limit,
    });

    return {
      select,
      sort,
      skip,
      limit,
    };
  }

  it('should return users with pagination', async () => {
    const user = createUserDocument();

    setupFind([user]);

    mockUser.countDocuments.mockResolvedValue(1);

    const result = await getAllUsers({
      page: 1,
      limit: 10,
    });

    expect(mockUser.find).toHaveBeenCalledWith({
      isDeleted: false,
    });

    expect(mockUser.countDocuments).toHaveBeenCalledWith({
      isDeleted: false,
    });

    expect(result.users).toHaveLength(1);

    expect(result.users[0]).toEqual({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      isActive: true,
      isDeleted: false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('should filter by role', async () => {
    setupFind([]);

    mockUser.countDocuments.mockResolvedValue(0);

    await getAllUsers({
      page: 1,
      limit: 10,
      role: 'admin',
    });

    expect(mockUser.find).toHaveBeenCalledWith({
      isDeleted: false,
      role: 'admin',
    });
  });

  it('should filter by active status', async () => {
    setupFind([]);

    mockUser.countDocuments.mockResolvedValue(0);

    await getAllUsers({
      page: 1,
      limit: 10,
      isActive: false,
    });

    expect(mockUser.find).toHaveBeenCalledWith({
      isDeleted: false,
      isActive: false,
    });
  });

  it('should search by name or email', async () => {
    setupFind([]);

    mockUser.countDocuments.mockResolvedValue(0);

    await getAllUsers({
      page: 1,
      limit: 10,
      search: 'john',
    });

    expect(mockUser.find).toHaveBeenCalledWith({
      isDeleted: false,
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
});

describe('getUserById', () => {
  it('should return a user by id', async () => {
    const user = createUserDocument();

    const query = createSelectMock(user);

    mockUser.findOne.mockReturnValue(query);

    const result = await getUserById('user-123');

    expect(mockUser.findOne).toHaveBeenCalledWith({
      _id: 'user-123',
      isDeleted: false,
    });

    expect(query.select).toHaveBeenCalledWith(
      'name email role isActive isDeleted createdAt updatedAt',
    );

    expect(result).toEqual({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      isActive: true,
      isDeleted: false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  it('should throw when user does not exist', async () => {
    const query = createSelectMock(null);

    mockUser.findOne.mockReturnValue(query);

    await expect(
      getUserById('user-123'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});

describe('adminUpdateUser', () => {
  it('should update another user', async () => {
    const user = createUserDocument();

    mockUser.findOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);

    user.save.mockResolvedValue(user);

    const result = await adminUpdateUser(
      'admin-123',
      'user-123',
      {
        name: 'Updated Name',
        email: 'updated@example.com',
        role: 'admin',
      },
    );

    expect(mockUser.findOne).toHaveBeenNthCalledWith(
      1,
      {
        _id: 'user-123',
        isDeleted: false,
      },
    );

    const duplicateEmailQuery =
      mockUser.findOne.mock.calls[1]?.[0];

    expect(duplicateEmailQuery).toBeDefined();

    expect(duplicateEmailQuery).toMatchObject({
      email: 'updated@example.com',
      isDeleted: false,
    });

    expect(
      duplicateEmailQuery?._id?.$ne?.toString(),
    ).toBe('user-123');

    expect(user.name).toBe('Updated Name');
    expect(user.email).toBe('updated@example.com');
    expect(user.role).toBe('admin');

    expect(user.save).toHaveBeenCalled();

    expect(result).toEqual({
      id: 'user-123',
      name: 'Updated Name',
      email: 'updated@example.com',
      role: 'admin',
      isActive: true,
      isDeleted: false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });

  it('should reject modifying own admin account', async () => {
    const user = createUserDocument({
      role: 'admin',
    });

    mockUser.findOne.mockResolvedValue(user);

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

  it('should reject duplicate email', async () => {
    const user = createUserDocument();

    const existingUser = createUserDocument({
      _id: {
        toString: () => 'another-user',
      },
      email: 'existing@example.com',
    });

    mockUser.findOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(existingUser);

    await expect(
      adminUpdateUser(
        'admin-123',
        'user-123',
        {
          email: 'existing@example.com',
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'USER_ALREADY_EXISTS',
    });

    expect(user.save).not.toHaveBeenCalled();
  });
});

describe('updateUserStatus', () => {
  it('should deactivate a user', async () => {
    const user = createUserDocument({
      isActive: true,
    });

    mockUser.findOne.mockResolvedValue(user);

    user.save.mockResolvedValue(user);

    mockRefreshToken.updateMany.mockResolvedValue({
      modifiedCount: 1,
    });

    const result = await updateUserStatus(
      'admin-123',
      'user-123',
      false,
    );

    expect(mockUser.findOne).toHaveBeenCalledWith({
      _id: 'user-123',
      isDeleted: false,
    });

    expect(user.isActive).toBe(false);
    expect(user.isDeleted).toBe(false);

    expect(mockRefreshToken.updateMany).toHaveBeenCalledWith(
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
    expect(result.isDeleted).toBe(false);
  });

  it('should activate a user', async () => {
    const user = createUserDocument({
      isActive: false,
    });

    mockUser.findOne.mockResolvedValue(user);

    user.save.mockResolvedValue(user);

    const result = await updateUserStatus(
      'admin-123',
      'user-123',
      true,
    );

    expect(user.isActive).toBe(true);
    expect(user.isDeleted).toBe(false);

    expect(mockRefreshToken.updateMany).not.toHaveBeenCalled();

    expect(result.isActive).toBe(true);
    expect(result.isDeleted).toBe(false);
  });

  it('should reject modifying own admin account', async () => {
    const user = createUserDocument({
      role: 'admin',
    });

    mockUser.findOne.mockResolvedValue(user);

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
  it('should soft delete a user', async () => {
    const user = createUserDocument({
      isActive: true,
      isDeleted: false,
    });

    mockUser.findOne.mockResolvedValue(user);

    user.save.mockResolvedValue(user);

    mockRefreshToken.updateMany.mockResolvedValue({
      modifiedCount: 1,
    });

    const result = await deleteUser(
      'admin-123',
      'user-123',
    );

    expect(mockUser.findOne).toHaveBeenCalledWith({
      _id: 'user-123',
      isDeleted: false,
    });

    expect(user.isActive).toBe(false);
    expect(user.isDeleted).toBe(true);

    expect(user.save).toHaveBeenCalled();

    expect(mockRefreshToken.updateMany).toHaveBeenCalledWith(
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

  it('should reject deleting own admin account', async () => {
    const user = createUserDocument({
      role: 'admin',
    });

    mockUser.findOne.mockResolvedValue(user);

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

  it('should reject a user that does not exist', async () => {
    mockUser.findOne.mockResolvedValue(null);

    await expect(
      deleteUser(
        'admin-123',
        'user-123',
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });
});