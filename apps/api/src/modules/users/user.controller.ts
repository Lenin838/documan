import type { Request, Response, RequestHandler } from 'express';

import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';

import { createUser,getCurrentUser } from './user.service.js';

export async function createUserController(
  req: Request,
  res: Response,
) {
  const user = await createUser(req.body);

  return sendSuccess(res, user, 201);
}

export const getCurrentUserController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED',
        ),
      );
    }

    const user = await getCurrentUser(req.user.userId);

    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
};