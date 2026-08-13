import bcrypt from 'bcrypt';

import { User } from './user.model.js';
import type { CreateUserInput } from './user.schema.js';
import { AppError } from '../../errors/app-error.js';

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