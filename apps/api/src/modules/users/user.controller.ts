import type { Request, Response, RequestHandler } from 'express';

import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';

import {
  createUser,
  getCurrentUser,
  updateCurrentUser,
  changePassword,
  getAllUsers,
  getUserById,
  adminUpdateUser,
  updateUserStatus,
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

export const getAllUsersController: RequestHandler = async (
  _req,
  res,
  next,
) => {
  try {
    const users = await getAllUsers();

    return sendSuccess(res, users);
  } catch (error) {
    return next(error);
  }
};

export const getUserByIdController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const { id } = res.locals.validatedParams;

    const user = await getUserById(id);

    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
};

export const adminUpdateUserController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const { id } = res.locals.validatedParams;

    const user = await adminUpdateUser(
      id,
      req.body,
    );

    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
};

export const updateUserStatusController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const { id } = res.locals.validatedParams;

    const user = await updateUserStatus(
      id,
      req.body.isActive,
    );

    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
};