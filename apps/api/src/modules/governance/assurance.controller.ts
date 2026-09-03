import type { RequestHandler } from 'express';
import { AppError } from '../../errors/app-error.js';
import { sendSuccess } from '../../utils/api-response.js';
import {
  getForwardAssurance,
  evaluateFormalAssurance,
  grantGovernanceWaiver,
  revokeGovernanceWaiver,
} from './assurance.service.js';

export const getAssuranceHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    const documentId = req.params.id as string;
    const result = await getForwardAssurance(req.user.userId, req.user.role, documentId);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};

export const evaluateAssuranceHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    const documentId = req.params.id as string;
    const result = await evaluateFormalAssurance(req.user.userId, req.user.role, documentId);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};

export const grantWaiverHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    const documentId = req.params.id as string;
    const { checkId, reason, expiresInDays } = req.body || {};
    const result = await grantGovernanceWaiver(req.user.userId, req.user.role, documentId, {
      checkId,
      reason,
      expiresInDays,
    });
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};

export const revokeWaiverHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    const documentId = req.params.id as string;
    const checkId = req.params.checkId as string;
    const result = await revokeGovernanceWaiver(req.user.userId, req.user.role, documentId, checkId);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};
