import { Types } from 'mongoose';

import { DocumentShare } from './document-share.model.js';
import type { SharePermission } from './document-share.model.js';
import { Document } from '../documents/document.model.js';
import { User } from '../users/user.model.js';
import type {
  CreateDocumentShareInput,
  UpdateDocumentShareInput,
} from './document-share.schema.js';
import { AppError } from '../../errors/app-error.js';
import {
  createNotificationInternal,
  safeNotify,
} from '../notifications/notification.service.js';
import {
  dispatchWebhookEvent,
  safeDispatchWebhook,
} from '../webhooks/webhook-delivery.service.js';

interface DocumentShareResponse {
  id: string;
  documentId: string;
  sharedWithUser: {
    id: string;
    name: string;
    email: string;
  };
  permission: SharePermission;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

function validateObjectId(id: string, errorMessage = 'Invalid ID'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(errorMessage, 400, 'INVALID_ID');
  }
}

async function verifyOwnerOrAdmin(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
) {
  validateObjectId(documentId, 'Invalid document ID');

  const filter: { _id: string; isDeleted: boolean; ownerId?: Types.ObjectId } = {
    _id: documentId,
    isDeleted: false,
  };

  if (role !== 'admin') {
    filter.ownerId = new Types.ObjectId(userId);
  }

  const document = await Document.findOne(filter);

  if (!document) {
    throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  return document;
}

export async function createDocumentShare(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  input: CreateDocumentShareInput,
): Promise<DocumentShareResponse> {
  const document = await verifyOwnerOrAdmin(userId, role, documentId);

  const targetUser = await User.findOne({
    email: input.email.toLowerCase(),
    isActive: true,
    isDeleted: false,
  });

  if (!targetUser) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (targetUser._id.toString() === document.ownerId.toString()) {
    throw new AppError(
      'Cannot share document with yourself',
      400,
      'SELF_SHARING_NOT_ALLOWED',
    );
  }

  const share = await DocumentShare.findOneAndUpdate(
    {
      documentId: document._id,
      sharedWithUserId: targetUser._id,
    },
    {
      permission: input.permission,
      createdBy: new Types.ObjectId(userId),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  if (targetUser._id.toString() !== userId) {
    await safeNotify(() =>
      createNotificationInternal({
        recipientUserId: targetUser._id,
        documentId: document._id,
        type: 'DOCUMENT_SHARED',
        actorUserId: userId,
      }),
    );
  }

  if (document.projectId) {
    const actorUser = await User.findById(userId).select('name email');
    await safeDispatchWebhook(async () => {
      await dispatchWebhookEvent({
        projectId: document.projectId!,
        eventType: 'DOCUMENT_SHARED',
        document: { id: document._id.toString(), title: document.title },
        actor: actorUser ? { id: actorUser._id.toString(), name: actorUser.name, email: actorUser.email } : null,
        data: { targetUserId: targetUser._id.toString(), permission: input.permission },
      });
    });
  }

  return {
    id: share._id.toString(),
    documentId: share.documentId.toString(),
    sharedWithUser: {
      id: targetUser._id.toString(),
      name: targetUser.name,
      email: targetUser.email,
    },
    permission: share.permission,
    createdBy: share.createdBy.toString(),
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };
}

export async function getDocumentShares(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
): Promise<DocumentShareResponse[]> {
  const document = await verifyOwnerOrAdmin(userId, role, documentId);

  const shares = await DocumentShare.find({
    documentId: document._id,
  })
    .populate<{ sharedWithUserId: { _id: Types.ObjectId; name: string; email: string } }>(
      'sharedWithUserId',
      'name email',
    )
    .sort({ createdAt: -1 });

  return shares.map((share) => ({
    id: share._id.toString(),
    documentId: share.documentId.toString(),
    sharedWithUser: {
      id: share.sharedWithUserId._id.toString(),
      name: share.sharedWithUserId.name,
      email: share.sharedWithUserId.email,
    },
    permission: share.permission,
    createdBy: share.createdBy.toString(),
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  }));
}

export async function updateDocumentShare(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  shareId: string,
  input: UpdateDocumentShareInput,
): Promise<DocumentShareResponse> {
  const document = await verifyOwnerOrAdmin(userId, role, documentId);
  validateObjectId(shareId, 'Invalid share ID');

  const share = await DocumentShare.findOne({
    _id: shareId,
    documentId: document._id,
  }).populate<{ sharedWithUserId: { _id: Types.ObjectId; name: string; email: string } }>(
    'sharedWithUserId',
    'name email',
  );

  if (!share) {
    throw new AppError('Share not found', 404, 'SHARE_NOT_FOUND');
  }

  share.permission = input.permission;
  await share.save();

  return {
    id: share._id.toString(),
    documentId: share.documentId.toString(),
    sharedWithUser: {
      id: share.sharedWithUserId._id.toString(),
      name: share.sharedWithUserId.name,
      email: share.sharedWithUserId.email,
    },
    permission: share.permission,
    createdBy: share.createdBy.toString(),
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };
}

export async function revokeDocumentShare(
  userId: string,
  role: 'user' | 'admin',
  documentId: string,
  shareId: string,
): Promise<{ message: string }> {
  const document = await verifyOwnerOrAdmin(userId, role, documentId);
  validateObjectId(shareId, 'Invalid share ID');

  const share = await DocumentShare.findOne({
    _id: shareId,
    documentId: document._id,
  });

  if (!share) {
    throw new AppError('Share not found', 404, 'SHARE_NOT_FOUND');
  }

  await DocumentShare.deleteOne({ _id: share._id });

  return {
    message: 'Share revoked successfully',
  };
}
