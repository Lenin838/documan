import type { RequestHandler } from 'express';

import {
  createProjectTopologyLink,
  getProjectTopologyLinks,
  updateProjectTopologyLink,
  deleteProjectTopologyLink,
  getProjectArchitectureGraph,
} from './project-topology.service.js';
import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';

export const createProjectTopologyLinkController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      return next(
        new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'),
      );
    }

    const { projectId } = res.locals.validatedParams;

    const link = await createProjectTopologyLink(
      req.user.userId,
      req.user.role,
      projectId,
      req.body,
    );

    return sendSuccess(res, link, 201);
  } catch (error) {
    return next(error);
  }
};

export const getProjectTopologyLinksController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      return next(
        new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'),
      );
    }

    const { projectId } = res.locals.validatedParams;

    const links = await getProjectTopologyLinks(
      req.user.userId,
      req.user.role,
      projectId,
    );

    return sendSuccess(res, { links });
  } catch (error) {
    return next(error);
  }
};

export const updateProjectTopologyLinkController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      return next(
        new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'),
      );
    }

    const { projectId, linkId } = res.locals.validatedParams;

    const link = await updateProjectTopologyLink(
      req.user.userId,
      req.user.role,
      projectId,
      linkId,
      req.body,
    );

    return sendSuccess(res, link);
  } catch (error) {
    return next(error);
  }
};

export const deleteProjectTopologyLinkController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      return next(
        new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'),
      );
    }

    const { projectId, linkId } = res.locals.validatedParams;

    const result = await deleteProjectTopologyLink(
      req.user.userId,
      req.user.role,
      projectId,
      linkId,
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};

export const getProjectArchitectureGraphController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      return next(
        new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED'),
      );
    }

    const { projectId } = res.locals.validatedParams;

    const graph = await getProjectArchitectureGraph(
      req.user.userId,
      req.user.role,
      projectId,
    );

    return sendSuccess(res, graph);
  } catch (error) {
    return next(error);
  }
};
