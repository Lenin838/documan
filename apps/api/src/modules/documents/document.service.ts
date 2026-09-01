import mongoose, { Types } from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';

import { Document, type DocumentStatus } from './document.model.js';
import { DocumentReview } from './document-review.model.js';
import { DocumentRelationship } from './document-relationship.model.js';
import { Folder } from '../folders/folder.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import { createDocumentAudit } from './document-audit.service.js';
import {
  createNotificationInternal,
  safeNotify,
} from '../notifications/notification.service.js';
import type {
  CreateDocumentInput,
  DocumentsQueryInput,
  UpdateDocumentInput,
  UpdateDocumentStatusInput,
} from './document.schema.js';

import { AppError } from '../../errors/app-error.js';

interface DocumentResponse {
  id: string;
  title: string;
  description?: string | undefined;
  folderId?: string | null | undefined;
  projectId?: string | null | undefined;
  tags: string[];
  status: DocumentStatus;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  ownerId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function normalizeTags(tags?: string[]): string[] {
  if (!tags) return [];
  const clean = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(clean));
}

function toDocumentResponse(
  document: {
    _id: Types.ObjectId;
    title: string;
    description?: string;
    folderId?: Types.ObjectId | null;
    projectId?: Types.ObjectId | null;
    tags?: string[];
    status?: DocumentStatus;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    ownerId: Types.ObjectId;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
): DocumentResponse {
  return {
    id: document._id.toString(),
    title: document.title,
    description: document.description,
    folderId: document.folderId ? document.folderId.toString() : null,
    projectId: document.projectId ? document.projectId.toString() : null,
    tags: document.tags || [],
    status: document.status || 'DRAFT',
    fileName: document.fileName,
    filePath: document.filePath,
    fileType: document.fileType,
    fileSize: document.fileSize,
    ownerId: document.ownerId.toString(),
    isDeleted: document.isDeleted,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function validateDocumentId(documentId: string) {
  if (!Types.ObjectId.isValid(documentId)) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }
}

async function verifyDocumentPermission(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  requiredPermission: 'READ' | 'EDIT',
) {
  validateDocumentId(documentId);

  const document = await Document.findOne({
    _id: documentId,
    isDeleted: false,
  });

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (role === 'admin' || document.ownerId.toString() === userId) {
    return { document, permission: 'EDIT' as const, isOwner: true };
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

  return { document, permission: share.permission, isOwner: false };
}

export async function createDocument(
  ownerId: string,
  input: CreateDocumentInput,
  file: {
    originalname: string;
    path: string;
    mimetype: string;
    size: number;
  },
) {
  let folderObjectId: Types.ObjectId | null = null;

  if (input.folderId) {
    if (!Types.ObjectId.isValid(input.folderId)) {
      throw new AppError('Folder not found', 404, 'FOLDER_NOT_FOUND');
    }

    const folderFilter: { _id: string; ownerId?: Types.ObjectId } = {
      _id: input.folderId,
    };

    const folderExists = await Folder.findOne(folderFilter);

    if (!folderExists) {
      throw new AppError('Folder not found', 404, 'FOLDER_NOT_FOUND');
    }

    folderObjectId = new Types.ObjectId(input.folderId);
  }

  const document = await Document.create({
    title: input.title,

    ...(input.description !== undefined
      ? { description: input.description }
      : {}),

    folderId: folderObjectId,
    tags: normalizeTags(input.tags),
    fileName: file.originalname,
    filePath: file.path,
    fileType: file.mimetype,
    fileSize: file.size,

    ownerId: new Types.ObjectId(ownerId),
    isDeleted: false,
  });

  const BUILTIN_TEMPLATES: Record<string, string> = {
    adr: 'Architecture Decision Record',
    'tech-spec': 'Technical Specification',
    runbook: 'Troubleshooting / Runbook',
  };

  const templateName = input.templateId ? BUILTIN_TEMPLATES[input.templateId] : undefined;
  const auditMetadata = templateName && input.templateId
    ? { templateId: input.templateId, templateName }
    : undefined;

  await createDocumentAudit(
    document._id.toString(),
    ownerId,
    'CREATE',
    auditMetadata,
  );

  return toDocumentResponse(document);
}

export async function getAllDocuments(
  ownerId: string,
  role: 'user' | 'admin',
  query: DocumentsQueryInput,
) {
  const {
    page,
    limit,
    search,
    isDeleted,
    folderId,
    projectId,
    view,
    tag,
    fileType,
  } = query;

  const filter: Record<string, unknown> = {
    isDeleted: isDeleted ?? false,
  };

  if (view === 'shared') {
    const shares = await DocumentShare.find({
      sharedWithUserId: new Types.ObjectId(ownerId),
    }).select('documentId');
    const sharedDocIds = shares.map((s) => s.documentId);
    filter._id = { $in: sharedDocIds };
  } else if (view === 'all' && role !== 'admin') {
    const shares = await DocumentShare.find({
      sharedWithUserId: new Types.ObjectId(ownerId),
    }).select('documentId');
    const sharedDocIds = shares.map((s) => s.documentId);
    filter.$or = [
      { ownerId: new Types.ObjectId(ownerId) },
      { _id: { $in: sharedDocIds } },
    ];
  } else if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  if (folderId) {
    if (folderId === 'none' || folderId === 'null') {
      filter.folderId = null;
    } else if (Types.ObjectId.isValid(folderId)) {
      filter.folderId = new Types.ObjectId(folderId);
    }
  }

  if (projectId) {
    if (projectId === 'none' || projectId === 'null') {
      filter.projectId = null;
    } else if (Types.ObjectId.isValid(projectId)) {
      filter.projectId = new Types.ObjectId(projectId);
    }
  }

  if (tag) {
    const tagArray = (Array.isArray(tag) ? tag : [tag])
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (tagArray.length > 0) {
      filter.tags = { $in: tagArray };
    }
  }

  if (fileType) {
    filter.fileType = { $regex: fileType, $options: 'i' };
  }

  if (search) {
    const searchFilter = [
      {
        title: {
          $regex: search,
          $options: 'i',
        },
      },
      {
        fileName: {
          $regex: search,
          $options: 'i',
        },
      },
    ];

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
      delete filter.$or;
    } else {
      filter.$or = searchFilter;
    }
  }

  const skip = (page - 1) * limit;

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Document.countDocuments(filter),
  ]);

  return {
    documents: documents.map(toDocumentResponse),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getDocumentById(
  ownerId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  const { document } = await verifyDocumentPermission(
    ownerId,
    role,
    documentId,
    'READ',
  );

  return toDocumentResponse(document);
}

export async function updateDocument(
  ownerId: string,
  documentId: string,
  input: UpdateDocumentInput,
  file?: {
    originalname: string;
    path: string;
    mimetype: string;
    size: number;
  },
  role: 'user' | 'admin' = 'user',
) {
  const { document, isOwner } = await verifyDocumentPermission(
    ownerId,
    role,
    documentId,
    'EDIT',
  );

  if (input.title !== undefined) {
    document.title = input.title;
  }

  if (input.description !== undefined) {
    document.description = input.description;
  }

  if (input.tags !== undefined) {
    document.tags = normalizeTags(input.tags);
  }

  if (input.folderId !== undefined) {
    if (!isOwner) {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }

    if (input.folderId && input.folderId !== 'none' && input.folderId !== 'null') {
      if (!Types.ObjectId.isValid(input.folderId)) {
        throw new AppError('Folder not found', 404, 'FOLDER_NOT_FOUND');
      }

      const folderExists = await Folder.findOne({ _id: input.folderId });

      if (!folderExists) {
        throw new AppError('Folder not found', 404, 'FOLDER_NOT_FOUND');
      }

      document.folderId = new Types.ObjectId(input.folderId);
    } else {
      document.folderId = null;
    }
  }

  if (file) {
    document.fileName = file.originalname;
    document.filePath = file.path;
    document.fileType = file.mimetype;
    document.fileSize = file.size;
  }

  const previousStatus = document.status || 'DRAFT';
  if (
    previousStatus === 'APPROVED' ||
    previousStatus === 'DEPRECATED' ||
    previousStatus === 'STALE'
  ) {
    document.status = 'DRAFT';
    await createDocumentAudit(
      document._id.toString(),
      ownerId,
      'STATUS_CHANGE',
      {
        previousStatus,
        newStatus: 'DRAFT',
        transitionType: 'AUTOMATIC',
        triggerSource: file ? 'FILE_REPLACE' : 'DOCUMENT_EDIT',
      },
    );
  }

  await document.save();

  await createDocumentAudit(
    document._id.toString(),
    ownerId,
    'UPDATE',
  );

  return toDocumentResponse(document);
}

export async function transitionDocumentStatusInternal(
  documentId: string,
  userId: string,
  newStatus: DocumentStatus,
  transitionType: 'AUTOMATIC' | 'MANUAL',
  triggerSource: string,
  reviewId?: string,
  reason?: string,
): Promise<{ previousStatus: DocumentStatus; updatedStatus: DocumentStatus }> {
  if (!Types.ObjectId.isValid(documentId)) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const doc = await Document.findOne({
    _id: new Types.ObjectId(documentId),
    isDeleted: false,
  });

  if (!doc) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const previousStatus = doc.status || 'DRAFT';
  if (previousStatus === newStatus) {
    return { previousStatus, updatedStatus: newStatus };
  }

  doc.status = newStatus;
  if (typeof doc.save === 'function') {
    await doc.save();
  }

  // Cancel active PENDING review if transitioning away from IN_REVIEW via manual action
  if (previousStatus === 'IN_REVIEW' && newStatus !== 'APPROVED') {
    await DocumentReview.updateMany(
      { documentId: doc._id, status: 'PENDING' },
      {
        $set: {
          status: 'CANCELLED',
          resolvedAt: new Date(),
          comment: reason || 'Cancelled due to manual document status change',
        },
      },
    );
  }

  await createDocumentAudit(documentId, userId, 'STATUS_CHANGE', {
    previousStatus,
    newStatus,
    transitionType,
    triggerSource,
    ...(reviewId ? { reviewId } : {}),
    ...(reason ? { reason } : {}),
  });

  if (newStatus === 'STALE' || newStatus === 'DEPRECATED') {
    const notificationType = newStatus === 'STALE' ? 'UPSTREAM_STALE' : 'UPSTREAM_DEPRECATED';
    await safeNotify(async () => {
      const isMocked = typeof (DocumentRelationship.find as unknown as { mock?: unknown }).mock !== 'undefined';
      if (mongoose.connection.readyState === 0 && !isMocked) {
        return;
      }

      const relationships = await DocumentRelationship.find({
        targetDocumentId: doc._id,
        type: 'DEPENDS_ON',
      }).populate<{ sourceDocumentId: { _id: Types.ObjectId; ownerId: Types.ObjectId; isDeleted: boolean } }>({
        path: 'sourceDocumentId',
        select: 'ownerId isDeleted',
      });

      for (const rel of relationships) {
        const sourceDoc = rel.sourceDocumentId;
        if (sourceDoc && !sourceDoc.isDeleted) {
          const downstreamOwnerId = sourceDoc.ownerId.toString();
          if (downstreamOwnerId !== userId) {
            await createNotificationInternal({
              recipientUserId: sourceDoc.ownerId,
              documentId: sourceDoc._id,
              type: notificationType,
              actorUserId: userId,
            });
          }
        }
      }
    });
  }

  return { previousStatus, updatedStatus: newStatus };
}

export async function updateDocumentStatus(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  input: UpdateDocumentStatusInput,
): Promise<DocumentResponse> {
  if (!Types.ObjectId.isValid(documentId)) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  const doc = await Document.findOne({
    _id: new Types.ObjectId(documentId),
    isDeleted: false,
  });

  if (!doc) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (role !== 'admin' && doc.ownerId.toString() !== userId) {
    const share = await DocumentShare.findOne({
      documentId: doc._id,
      sharedWithUserId: new Types.ObjectId(userId),
    });

    if (!share || share.permission !== 'EDIT') {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    }
  }

  await transitionDocumentStatusInternal(
    documentId,
    userId,
    input.status,
    'MANUAL',
    'MANUAL_OVERRIDE',
    undefined,
    input.reason,
  );

  const updatedDoc = await Document.findById(documentId);
  if (!updatedDoc) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  return toDocumentResponse(updatedDoc);
}

export async function deleteDocument(
  ownerId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateDocumentId(documentId);
  const filter: {
    _id: string;
    isDeleted: boolean;
    ownerId?: Types.ObjectId;
  } = {
    _id: documentId,
    isDeleted: false,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  const document = await Document.findOne(filter);

  if (!document) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }

  document.isDeleted = true;

  await document.save();

  await createDocumentAudit(
    document._id.toString(),
    ownerId,
    'DELETE',
  );

  return {
    message: 'Document deleted successfully',
  };
}

export async function downloadDocument(
  ownerId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  const { document } = await verifyDocumentPermission(
    ownerId,
    role,
    documentId,
    'READ',
  );

  try {
    await fs.access(document.filePath);
  } catch {
    throw new AppError(
      'Document file not found',
      404,
      'DOCUMENT_FILE_NOT_FOUND',
    );
  }

  return {
    filePath: path.resolve(document.filePath),
    fileName: document.fileName,
    fileType: document.fileType,
  };
}

export async function viewDocument(
  ownerId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  const { document } = await verifyDocumentPermission(
    ownerId,
    role,
    documentId,
    'READ',
  );

  try {
    await fs.access(document.filePath);
  } catch {
    throw new AppError(
      'Document file not found',
      404,
      'DOCUMENT_FILE_NOT_FOUND',
    );
  }

  return {
    filePath: path.resolve(document.filePath),
    fileName: document.fileName,
    fileType: document.fileType,
  };
}

export async function restoreDocument(
  ownerId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateDocumentId(documentId);

  const filter: {
    _id: string;
    isDeleted: boolean;
    ownerId?: Types.ObjectId;
  } = {
    _id: documentId,
    isDeleted: true,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(ownerId);
  }

  const document = await Document.findOne(filter);

  if (!document) {
    throw new AppError(
      'Document not found',
      404,
      'DOCUMENT_NOT_FOUND',
    );
  }

  document.isDeleted = false;

  await document.save();

  await createDocumentAudit(
    document._id.toString(),
    ownerId,
    'RESTORE',
  );

  return {
    message: 'Document restored successfully',
  };
}