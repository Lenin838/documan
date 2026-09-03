import type { RequestHandler } from 'express';
import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';
import {
  getForwardEvidence,
  getReverseDocument,
  getReverseEndpoint,
  getReverseReference,
} from './evidence.service.js';

export const getForwardEvidenceController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const { id } = req.params;
    const documentId = typeof id === 'string' && id ? id : typeof req.query.documentId === 'string' ? req.query.documentId : undefined;

    if (!documentId) {
      return next(new AppError('Document ID is required', 400, 'DOCUMENT_ID_REQUIRED'));
    }

    const result = await getForwardEvidence(req.user.userId, req.user.role, documentId);

    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
};

export const getReverseEndpointController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const endpointId = typeof req.query.endpointId === 'string' ? req.query.endpointId : undefined;

    if (!endpointId) {
      return next(new AppError('Endpoint ID is required', 400, 'ENDPOINT_ID_REQUIRED'));
    }

    const result = await getReverseEndpoint(req.user.userId, req.user.role, endpointId);

    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
};

export const getReverseDocumentController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const targetDocumentId = typeof req.query.targetDocumentId === 'string' ? req.query.targetDocumentId : undefined;
    const relationshipType = typeof req.query.relationshipType === 'string' ? req.query.relationshipType : undefined;

    if (!targetDocumentId) {
      return next(new AppError('Target document ID is required', 400, 'TARGET_DOCUMENT_ID_REQUIRED'));
    }

    const result = await getReverseDocument(
      req.user.userId,
      req.user.role,
      targetDocumentId,
      relationshipType,
    );

    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
};

export const getReverseReferenceController: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const url = typeof req.query.url === 'string' ? req.query.url : undefined;

    if (!url) {
      return next(new AppError('URL parameter is required', 400, 'URL_REQUIRED'));
    }

    const result = await getReverseReference(req.user.userId, req.user.role, url);

    return sendSuccess(res, result);
  } catch (err) {
    return next(err);
  }
};
