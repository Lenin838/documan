import type { RequestHandler } from 'express';

import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './notification.service.js';

export const getNotificationsController: RequestHandler = async (
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

    const query = res.locals.validatedQuery;

    const result = await getUserNotifications(
      req.user.userId,
      req.user.role,
      query,
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};

export const markNotificationAsReadController: RequestHandler = async (
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

    const { id } = res.locals.validatedParams;

    const result = await markNotificationAsRead(req.user.userId, id);

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};

export const markAllNotificationsAsReadController: RequestHandler = async (
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

    const result = await markAllNotificationsAsRead(req.user.userId);

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};
