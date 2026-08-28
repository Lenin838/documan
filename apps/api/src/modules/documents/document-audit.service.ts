import { Types } from 'mongoose';

import {
  DocumentAudit,
  type DocumentAuditAction,
} from './document-audit.model.js';

import { Document } from './document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import type { DocumentAuditHistoryQueryInput } from './document.schema.js';

import { AppError } from '../../errors/app-error.js';

export async function createDocumentAudit(
  documentId: string,
  userId: string,
  action: DocumentAuditAction,
  metadata?: Record<string, unknown>,
) {
  if (!Types.ObjectId.isValid(documentId)) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }

  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError(
      'User not found',
      404,
      'USER_NOT_FOUND',
    );
  }

  const audit = await DocumentAudit.create({
    documentId: new Types.ObjectId(documentId),
    userId: new Types.ObjectId(userId),
    action,
    ...(metadata !== undefined ? { metadata } : {}),
  });

  return audit;
}

export async function getDocumentAuditHistory(
  ownerId: string,
  role: 'user' | 'admin',
  documentId: string,
  query: DocumentAuditHistoryQueryInput = { page: 1, limit: 10 },
) {
  if (!Types.ObjectId.isValid(documentId)) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }

  if (!Types.ObjectId.isValid(ownerId)) {
    throw new AppError(
      'User not found',
      404,
      'USER_NOT_FOUND',
    );
  }

  const document = await Document.findOne({
    _id: new Types.ObjectId(documentId),
    isDeleted: false,
  });

  if (!document) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }

  if (role !== 'admin' && document.ownerId.toString() !== ownerId) {
    const share = await DocumentShare.findOne({
      documentId: document._id,
      sharedWithUserId: new Types.ObjectId(ownerId),
    });

    if (!share) {
      throw new AppError(
        'Document not found',
        404,
        'DOCUMENT_NOT_FOUND',
      );
    }
  }

  const {
    page = 1,
    limit = 10,
    action,
  } = query;

  const auditFilter: {
    documentId: Types.ObjectId;
    action?: DocumentAuditAction;
  } = {
    documentId: new Types.ObjectId(documentId),
  };

  if (action) {
    auditFilter.action = action;
  }

  const skip = (page - 1) * limit;

  const [audits, total] = await Promise.all([
    DocumentAudit.find(auditFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    DocumentAudit.countDocuments(auditFilter),
  ]);

  return {
    auditHistory: audits,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}