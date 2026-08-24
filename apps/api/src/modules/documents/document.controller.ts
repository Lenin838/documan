import type {
  RequestHandler,
} from 'express';

import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';

import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
} from './document.service.js';

export const createDocumentController: RequestHandler = async (
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

    if (!req.file) {
      return next(
        new AppError(
          'Document file is required',
          400,
          'DOCUMENT_FILE_REQUIRED',
        ),
      );
    }

    const document = await createDocument(
      req.user.userId,
      req.body,
      {
        originalname: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    );

    return sendSuccess(res, document, 201);
  } catch (error) {
    return next(error);
  }
};

export const getAllDocumentsController: RequestHandler = async (
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

    const documents = await getAllDocuments(
      req.user.userId,
      req.user.role,
      res.locals.validatedQuery,
    );

    return sendSuccess(res, documents);
  } catch (error) {
    return next(error);
  }
};

export const getDocumentByIdController: RequestHandler = async (
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

    const document = await getDocumentById(
      req.user.userId,
      req.user.role,
      id,
    );

    return sendSuccess(res, document);
  } catch (error) {
    return next(error);
  }
};

export const updateDocumentController: RequestHandler = async (
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

    const document = await updateDocument(
      req.user.userId,
      id,
      req.body,
    );

    return sendSuccess(res, document);
  } catch (error) {
    return next(error);
  }
};

export const deleteDocumentController: RequestHandler = async (
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

    const result = await deleteDocument(
      req.user.userId,
      req.user.role,
      id,
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};