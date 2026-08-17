import bcrypt from 'bcrypt';

import { User } from './user.model.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  ChangePasswordInput,
  AdminUpdateUserInput,
  AdminUsersQueryInput,
} from './user.schema.js';
import { AppError } from '../../errors/app-error.js';
import { RefreshToken } from '../auth/refresh-token.model.js';

export async function createUser(input: CreateUserInput) {
  const existingUser = await User.findOne({
    email: input.email,
  });

  if (existingUser) {
    throw new AppError(
        'User with this email already exists',
        409,
        'USER_ALREADY_EXISTS',
        );
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId).select(
    'name email role isActive createdAt updatedAt',
  );

  if (!user) {
    throw new AppError(
      'User not found',
      404,
      'USER_NOT_FOUND',
    );
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function updateCurrentUser(
  userId: string,
  input: UpdateUserInput,
) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        name: input.name,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).select(
    'name email role isActive createdAt updatedAt',
  );

  if (!user) {
    throw new AppError(
      'User not found',
      404,
      'USER_NOT_FOUND',
    );
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
) {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(
      'User not found',
      404,
      'USER_NOT_FOUND',
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(
      'Current password is incorrect',
      401,
      'INVALID_CURRENT_PASSWORD',
    );
  }

  const passwordHash = await bcrypt.hash(
    input.newPassword,
    12,
  );

  user.passwordHash = passwordHash;

  await user.save();

  await RefreshToken.updateMany(
    {
      userId: user._id,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  );

  return {
    message: 'Password changed successfully',
  };
}

export async function getAllUsers(
  query: AdminUsersQueryInput,
) {
  const {
    page,
    limit,
    role,
    isActive,
    search,
  } = query;

  const filter: {
    role?: 'user' | 'admin';
    isActive?: boolean;
    $or?: Array<{
      name?: { $regex: string; $options: string };
      email?: { $regex: string; $options: string };
    }>;
  } = {};

  if (role) {
    filter.role = role;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  if (search) {
    filter.$or = [
      {
        name: {
          $regex: search,
          $options: 'i',
        },
      },
      {
        email: {
          $regex: search,
          $options: 'i',
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(
        'name email role isActive createdAt updatedAt',
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    User.countDocuments(filter),
  ]);

  return {
    users: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


export async function getUserById(userId: string) {
  const user = await User.findById(userId).select(
    'name email role isActive createdAt updatedAt',
  );

  if (!user) {
    throw new AppError(
      'User not found',
      404,
      'USER_NOT_FOUND',
    );
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function adminUpdateUser(
  userId: string,
  input: AdminUpdateUserInput,
) {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(
      'User not found',
      404,
      'USER_NOT_FOUND',
    );
  }

  if (input.email && input.email !== user.email) {
    const existingUser = await User.findOne({
      email: input.email,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      throw new AppError(
        'User with this email already exists',
        409,
        'USER_ALREADY_EXISTS',
      );
    }
  }

  if (input.name !== undefined) {
    user.name = input.name;
  }

  if (input.email !== undefined) {
    user.email = input.email;
  }

  if (input.role !== undefined) {
    user.role = input.role;
  }

  await user.save();

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function updateUserStatus(
  userId: string,
  isActive: boolean,
) {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(
      'User not found',
      404,
      'USER_NOT_FOUND',
    );
  }

  user.isActive = isActive;

  await user.save();

  if (!isActive) {
    await RefreshToken.updateMany(
      {
        userId: user._id,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      },
    );
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}