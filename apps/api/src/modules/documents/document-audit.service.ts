import { Types } from 'mongoose';

import {
  DocumentAudit,
  type DocumentAuditAction,
} from './document-audit.model.js';

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