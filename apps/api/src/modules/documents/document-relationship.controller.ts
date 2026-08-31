import type { RequestHandler } from 'express';

import {
  createDocumentRelationship,
  getDocumentRelationships,
  deleteDocumentRelationship,
  getDocumentDependencies,
} from './document-relationship.service.js';
import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';

export const createDocumentRelationshipController: RequestHandler = async (
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

    const relationship = await createDocumentRelationship(
      req.user.userId,
      req.user.role,
      id,
      req.body,
    );

    return sendSuccess(res, relationship, 201);
  } catch (error) {
    return next(error);
  }
};

export const getDocumentRelationshipsController: RequestHandler = async (
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

    const relationships = await getDocumentRelationships(
      req.user.userId,
      req.user.role,
      id,
    );

    return sendSuccess(res, { relationships });
  } catch (error) {
    return next(error);
  }
};

export const deleteDocumentRelationshipController: RequestHandler = async (
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

    const { id, relationshipId } = res.locals.validatedParams;

    const result = await deleteDocumentRelationship(
      req.user.userId,
      req.user.role,
      id,
      relationshipId,
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};

export const getDocumentDependenciesController: RequestHandler = async (
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
    const { maxDepth } = res.locals.validatedQuery || {};

    const dependencies = await getDocumentDependencies(
      req.user.userId,
      req.user.role,
      id,
      maxDepth ? Number(maxDepth) : 3,
    );

    return sendSuccess(res, dependencies);
  } catch (error) {
    return next(error);
  }
};
