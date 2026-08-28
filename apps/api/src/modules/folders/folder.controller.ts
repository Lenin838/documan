import type { RequestHandler } from 'express';

import {
  createFolder,
  deleteFolder,
  getFolderById,
  getFolders,
  updateFolder,
} from './folder.service.js';
import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';

export const createFolderController: RequestHandler = async (
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

    const folder = await createFolder(req.user.userId, req.body);
    return sendSuccess(res, folder, 201);
  } catch (error) {
    return next(error);
  }
};

export const getFoldersController: RequestHandler = async (
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

    const folders = await getFolders(req.user.userId, req.user.role);
    return sendSuccess(res, { folders });
  } catch (error) {
    return next(error);
  }
};

export const getFolderByIdController: RequestHandler = async (
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

    const folder = await getFolderById(
      req.user.userId,
      req.user.role,
      req.params.id as string,
    );

    return sendSuccess(res, folder);
  } catch (error) {
    return next(error);
  }
};

export const updateFolderController: RequestHandler = async (
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

    const folder = await updateFolder(
      req.user.userId,
      req.user.role,
      req.params.id as string,
      req.body,
    );

    return sendSuccess(res, folder);
  } catch (error) {
    return next(error);
  }
};

export const deleteFolderController: RequestHandler = async (
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

    const result = await deleteFolder(
      req.user.userId,
      req.user.role,
      req.params.id as string,
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};
