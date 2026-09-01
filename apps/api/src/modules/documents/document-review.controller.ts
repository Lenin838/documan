import type { RequestHandler } from 'express';

import {
  createDocumentReview,
  getDocumentReviews,
  approveDocumentReview,
  requestChangesDocumentReview,
  getPendingReviews,
} from './document-review.service.js';
import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';

export const createDocumentReviewController: RequestHandler = async (
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

    const review = await createDocumentReview(
      req.user.userId,
      req.user.role,
      id,
      req.body,
    );

    return sendSuccess(res, review, 201);
  } catch (error) {
    return next(error);
  }
};

export const getDocumentReviewsController: RequestHandler = async (
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

    const reviews = await getDocumentReviews(
      req.user.userId,
      req.user.role,
      id,
    );

    return sendSuccess(res, { reviews });
  } catch (error) {
    return next(error);
  }
};

export const approveDocumentReviewController: RequestHandler = async (
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

    const { id, reviewId } = res.locals.validatedParams;

    const review = await approveDocumentReview(
      req.user.userId,
      req.user.role,
      id,
      reviewId,
      req.body,
    );

    return sendSuccess(res, review);
  } catch (error) {
    return next(error);
  }
};

export const requestChangesDocumentReviewController: RequestHandler = async (
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

    const { id, reviewId } = res.locals.validatedParams;

    const review = await requestChangesDocumentReview(
      req.user.userId,
      req.user.role,
      id,
      reviewId,
      req.body,
    );

    return sendSuccess(res, review);
  } catch (error) {
    return next(error);
  }
};

export const getPendingReviewsController: RequestHandler = async (
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

    const reviews = await getPendingReviews(
      req.user.userId,
      req.user.role,
    );

    return sendSuccess(res, { reviews });
  } catch (error) {
    return next(error);
  }
};
