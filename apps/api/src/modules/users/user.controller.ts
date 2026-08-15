import type { Request, Response, RequestHandler } from 'express';

import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';

import {
  createUser,
  getCurrentUser,
  updateCurrentUser,
  changePassword
} from './user.service.js';
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


export const updateCurrentUserController: RequestHandler = async (
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

    const user = await updateCurrentUser(
      req.user.userId,
      req.body,
    );

    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
};

export const changePasswordController: RequestHandler = async (
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

    const result = await changePassword(
      req.user.userId,
      req.body,
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};