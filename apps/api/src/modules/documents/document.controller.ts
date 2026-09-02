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
  restoreDocument,
  downloadDocument,
  viewDocument,
  updateDocumentStatus,
  verifyDocumentImpact,
} from './document.service.js';

import {
  getDocumentAuditHistory,
} from './document-audit.service.js';

import {
  getDocumentKnowledgeHealth,
  updateDocumentSteward,
} from './knowledge-risk.service.js';

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
      req.file
        ? {
            originalname: req.file.originalname,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : undefined,
      req.user.role,
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

export const restoreDocumentController: RequestHandler = async (
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

    const result = await restoreDocument(
      req.user.userId,
      req.user.role,
      id,
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};

export const downloadDocumentController: RequestHandler = async (
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

    const document = await downloadDocument(
      req.user.userId,
      req.user.role,
      id,
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.fileName}"`,
    );

    res.setHeader(
      'Content-Type',
      document.fileType,
    );

    return res.sendFile(document.filePath);
  } catch (error) {
    return next(error);
  }
};

export const viewDocumentController: RequestHandler = async (
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

    const document = await viewDocument(
      req.user.userId,
      req.user.role,
      id,
    );

    res.setHeader(
      'Content-Disposition',
      `inline; filename="${document.fileName}"`,
    );

    res.setHeader(
      'Content-Type',
      document.fileType,
    );

    return res.sendFile(document.filePath);
  } catch (error) {
    return next(error);
  }
};

export const getDocumentAuditHistoryController: RequestHandler =
  async (
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

      const result = await getDocumentAuditHistory(
        req.user.userId,
        req.user.role,
        id,
        res.locals.validatedQuery,
      );

      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

export const updateDocumentStatusController: RequestHandler = async (
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

    const document = await updateDocumentStatus(
      req.user.userId,
      req.user.role,
      id,
      req.body,
    );

    return sendSuccess(res, document);
  } catch (error) {
    return next(error);
  }
};

export const verifyDocumentImpactController: RequestHandler = async (
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

    const document = await verifyDocumentImpact(
      req.user.userId,
      req.user.role,
      id,
      req.body,
    );

    return sendSuccess(res, document);
  } catch (error) {
    return next(error);
  }
};

export const getDocumentHealthController: RequestHandler = async (
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

    const health = await getDocumentKnowledgeHealth(
      req.user.userId,
      req.user.role,
      id,
    );

    return sendSuccess(res, health);
  } catch (error) {
    return next(error);
  }
};

export const updateDocumentStewardController: RequestHandler = async (
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
    const { stewardId } = req.body;

    const result = await updateDocumentSteward(
      req.user.userId,
      req.user.role,
      id,
      stewardId !== undefined ? stewardId : null,
    );

    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};