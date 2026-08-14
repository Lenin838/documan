import type { RequestHandler } from 'express';

import { sendSuccess } from '../../utils/api-response.js';
import { AppError } from '../../errors/app-error.js';
import { env } from '../../config/env.js';
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
} from './auth.service.js';

export const loginController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const result = await loginUser(req.body);

    res.cookie('documan_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:
        env.REFRESH_TOKEN_EXPIRES_IN_DAYS *
        24 *
        60 *
        60 *
        1000,
      path: '/api/v1/auth',
    });

    return sendSuccess(res, {
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const refreshToken = req.cookies?.documan_refresh_token;

    if (!refreshToken) {
      return next(
        new AppError(
          'Refresh token is required',
          401,
          'REFRESH_TOKEN_REQUIRED',
        ),
      );
    }

    const result = await refreshAccessToken(refreshToken);

    res.cookie('documan_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:
        env.REFRESH_TOKEN_EXPIRES_IN_DAYS *
        24 *
        60 *
        60 *
        1000,
      path: '/api/v1/auth',
    });

    return sendSuccess(res, {
      accessToken: result.accessToken,
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const refreshToken = req.cookies?.documan_refresh_token;

    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    res.clearCookie('documan_refresh_token', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return sendSuccess(res, {
      message: 'Logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
};