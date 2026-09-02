import type { RequestHandler } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import { AppError } from '../../errors/app-error.js';
import { getDocumentById } from './document.service.js';
import {
  listDocumentVersions,
  getDocumentVersionById,
  compareDocumentVersions,
} from './document-version.service.js';
import {
  listDocumentVersionsSchema,
  getDocumentVersionSchema,
  compareDocumentVersionsSchema,
} from './document-version.schema.js';

export const listDocumentVersionsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const { params, query } = listDocumentVersionsSchema.parse({
      params: req.params,
      query: req.query,
    });

    const userId = req.user.userId;
    const role = req.user.role;
    const document = await getDocumentById(userId, role, params.id);

    const result = await listDocumentVersions(
      params.id,
      document.projectId || null,
      query.page,
      query.limit,
    );

    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
};

export const getDocumentVersionController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const { params, query } = getDocumentVersionSchema.parse({
      params: req.params,
      query: req.query,
    });

    const userId = req.user.userId;
    const role = req.user.role;
    const document = await getDocumentById(userId, role, params.id);

    const version = await getDocumentVersionById(params.id, params.versionId, document.projectId || null);

    if (query.download) {
      return res.download(version.filePath, version.fileName);
    }

    return sendSuccess(res, version);
  } catch (err) {
    return next(err);
  }
};

export const compareDocumentVersionsController: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const { params, body } = compareDocumentVersionsSchema.parse({
      params: req.params,
      body: req.body,
    });

    const userId = req.user.userId;
    const role = req.user.role;
    const document = await getDocumentById(userId, role, params.id);

    const diffResult = await compareDocumentVersions(
      params.id,
      document.projectId || null,
      body.sourceVersionId,
      body.targetVersionId,
    );

    return sendSuccess(res, diffResult);
  } catch (err) {
    return next(err);
  }
};
