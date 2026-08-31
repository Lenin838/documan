import { Types } from 'mongoose';

import {
  DocumentReference,
  type DocumentReferenceDocument,
  type TechnicalReferenceType,
} from './document-reference.model.js';
import { Document } from './document.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { createDocumentAudit } from './document-audit.service.js';
import type {
  CreateDocumentReferenceInput,
  UpdateDocumentReferenceInput,
} from './document-reference.schema.js';
import { AppError } from '../../errors/app-error.js';

export interface DocumentReferenceResponse {
  id: string;
  documentId: string;
  type: TechnicalReferenceType;
  title: string;
  url: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

function validateObjectId(id: string, errorMessage = 'Invalid document ID'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 404, 'DOCUMENT_NOT_FOUND');
  }
}

async function verifyDocumentAccess(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  requiredPermission: 'READ' | 'EDIT',
) {
  validateObjectId(documentId, 'Invalid document ID');

  const document = await Document.findOne({
    _id: documentId,
    isDeleted: false,
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (role === 'admin' || document.ownerId.toString() === userId) {
    return { document, isOwner: true, permission: 'EDIT' as const };
  }

  const share = await DocumentShare.findOne({
    documentId: document._id,
    sharedWithUserId: new Types.ObjectId(userId),
  });

  if (!share) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (requiredPermission === 'EDIT' && share.permission !== 'EDIT') {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }

  return { document, isOwner: false, permission: share.permission };
}

function toDocumentReferenceResponse(
  ref: DocumentReferenceDocument & { _id: Types.ObjectId },
): DocumentReferenceResponse {
  return {
    id: ref._id.toString(),
    documentId: ref.documentId.toString(),
    type: ref.type,
    title: ref.title,
    url: ref.url,
    createdBy: ref.createdBy.toString(),
    createdAt: ref.createdAt,
    updatedAt: ref.updatedAt,
  };
}

export async function createDocumentReference(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  input: CreateDocumentReferenceInput,
): Promise<DocumentReferenceResponse> {
  const { document } = await verifyDocumentAccess(
    userId,
    role,
    documentId,
    'EDIT',
  );

  const existing = await DocumentReference.findOne({
    documentId: document._id,
    type: input.type,
    url: input.url,
  });

  if (existing) {
    throw new AppError(
      'Technical reference already exists for this document',
      400,
      'REFERENCE_ALREADY_EXISTS',
    );
  }

  const reference = await DocumentReference.create({
    documentId: document._id,
    type: input.type,
    title: input.title,
    url: input.url,
    createdBy: new Types.ObjectId(userId),
  });

  await createDocumentAudit(
    document._id.toString(),
    userId,
    'TECHNICAL_REFERENCE_CREATE',
    {
      referenceId: reference._id.toString(),
      type: reference.type,
      title: reference.title,
      url: reference.url,
    },
  );

  return toDocumentReferenceResponse(reference);
}

export async function getDocumentReferences(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
): Promise<DocumentReferenceResponse[]> {
  const { document } = await verifyDocumentAccess(
    userId,
    role,
    documentId,
    'READ',
  );

  const references = await DocumentReference.find({
    documentId: document._id,
  }).sort({ createdAt: -1 });

  return references.map(toDocumentReferenceResponse);
}

export async function updateDocumentReference(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  referenceId: string,
  input: UpdateDocumentReferenceInput,
): Promise<DocumentReferenceResponse> {
  const { document } = await verifyDocumentAccess(
    userId,
    role,
    documentId,
    'EDIT',
  );

  if (!Types.ObjectId.isValid(referenceId)) {
    throw new AppError('Technical reference not found', 404, 'REFERENCE_NOT_FOUND');
  }

  const reference = await DocumentReference.findOne({
    _id: new Types.ObjectId(referenceId),
    documentId: document._id,
  });

  if (!reference) {
    throw new AppError('Technical reference not found', 404, 'REFERENCE_NOT_FOUND');
  }

  const targetType = input.type ?? reference.type;
  const targetUrl = input.url ?? reference.url;

  const existing = await DocumentReference.findOne({
    documentId: document._id,
    type: targetType,
    url: targetUrl,
    _id: { $ne: reference._id },
  });

  if (existing) {
    throw new AppError(
      'Technical reference already exists for this document',
      400,
      'REFERENCE_ALREADY_EXISTS',
    );
  }

  if (input.type !== undefined) {
    reference.type = input.type;
  }
  if (input.title !== undefined) {
    reference.title = input.title;
  }
  if (input.url !== undefined) {
    reference.url = input.url;
  }

  await reference.save();

  await createDocumentAudit(
    document._id.toString(),
    userId,
    'TECHNICAL_REFERENCE_UPDATE',
    {
      referenceId: reference._id.toString(),
      type: reference.type,
      title: reference.title,
      url: reference.url,
    },
  );

  return toDocumentReferenceResponse(reference);
}

export async function deleteDocumentReference(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  referenceId: string,
): Promise<{ message: string }> {
  const { document } = await verifyDocumentAccess(
    userId,
    role,
    documentId,
    'EDIT',
  );

  if (!Types.ObjectId.isValid(referenceId)) {
    throw new AppError('Technical reference not found', 404, 'REFERENCE_NOT_FOUND');
  }

  const reference = await DocumentReference.findOne({
    _id: new Types.ObjectId(referenceId),
    documentId: document._id,
  });

  if (!reference) {
    throw new AppError('Technical reference not found', 404, 'REFERENCE_NOT_FOUND');
  }

  await DocumentReference.deleteOne({ _id: reference._id });

  await createDocumentAudit(
    document._id.toString(),
    userId,
    'TECHNICAL_REFERENCE_DELETE',
    {
      referenceId: reference._id.toString(),
      type: reference.type,
      title: reference.title,
      url: reference.url,
    },
  );

  return {
    message: 'Technical reference removed successfully',
  };
}
