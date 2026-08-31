import type { RequestHandler } from 'express';

import {
  createDocumentReference,
  getDocumentReferences,
  updateDocumentReference,
  deleteDocumentReference,
} from './document-reference.service.js';
import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';

export const createDocumentReferenceController: RequestHandler = async (
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

    const reference = await createDocumentReference(
      req.user.userId,
      req.user.role,
      id,
      res.locals.validatedBody,
    );

    return sendSuccess(res, reference, 201);
  } catch (error) {
    return next(error);
  }
};

export const getDocumentReferencesController: RequestHandler = async (
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

    const references = await getDocumentReferences(
      req.user.userId,
      req.user.role,
      id,
    );

    return sendSuccess(res, { references });
  } catch (error) {
    return next(error);
  }
};

export const updateDocumentReferenceController: RequestHandler = async (
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

    const { id, referenceId } = res.locals.validatedParams;

    const reference = await updateDocumentReference(
      req.user.userId,
      req.user.role,
      id,
      referenceId,
      res.locals.validatedBody,
    );

    return sendSuccess(res, reference);
  } catch (error) {
    return next(error);
  }
};

export const deleteDocumentReferenceController: RequestHandler = async (
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

    const { id, referenceId } = res.locals.validatedParams;

    const result = await deleteDocumentReference(
      req.user.userId,
      req.user.role,
      id,
      referenceId,
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};
