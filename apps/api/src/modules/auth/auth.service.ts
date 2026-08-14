import bcrypt from 'bcrypt';

import { AppError } from '../../errors/app-error.js';
import { generateAccessToken } from '../../utils/jwt.js';
import { User } from '../users/user.model.js';

import type { LoginInput } from './auth.schema.js';

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({
    email: input.email.toLowerCase(),
  });

  if (!user) {
    throw new AppError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  if (!user.isActive) {
    throw new AppError(
      'User account is inactive',
      403,
      'ACCOUNT_INACTIVE',
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  const accessToken = generateAccessToken(user.id);

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  };
}