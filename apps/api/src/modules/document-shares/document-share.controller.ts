import type { RequestHandler } from 'express';

import {
  createDocumentShare,
  getDocumentShares,
  revokeDocumentShare,
  updateDocumentShare,
} from './document-share.service.js';
import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';

export const createDocumentShareController: RequestHandler = async (
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

    const share = await createDocumentShare(
      req.user.userId,
      req.user.role,
      req.params.id as string,
      req.body,
    );

    return sendSuccess(res, share, 201);
  } catch (error) {
    return next(error);
  }
};

export const getDocumentSharesController: RequestHandler = async (
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

    const shares = await getDocumentShares(
      req.user.userId,
      req.user.role,
      req.params.id as string,
    );

    return sendSuccess(res, { shares });
  } catch (error) {
    return next(error);
  }
};

export const updateDocumentShareController: RequestHandler = async (
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

    const share = await updateDocumentShare(
      req.user.userId,
      req.user.role,
      req.params.id as string,
      req.params.shareId as string,
      req.body,
    );

    return sendSuccess(res, share);
  } catch (error) {
    return next(error);
  }
};

export const revokeDocumentShareController: RequestHandler = async (
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

    const result = await revokeDocumentShare(
      req.user.userId,
      req.user.role,
      req.params.id as string,
      req.params.shareId as string,
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};
