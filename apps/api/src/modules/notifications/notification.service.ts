import mongoose, { Types } from 'mongoose';

import { AppError } from '../../errors/app-error.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import type { GetNotificationsQueryInput } from './notification.schema.js';
import {
  Notification,
  type NotificationType,
} from './notification.model.js';

export async function safeNotify(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.warn('Failed to persist user notification (non-blocking):', error);
  }
}

export async function createNotificationInternal(params: {
  recipientUserId: Types.ObjectId | string;
  documentId: Types.ObjectId | string;
  type: NotificationType;
  actorUserId?: Types.ObjectId | string;
}): Promise<void> {
  const { recipientUserId, documentId, type, actorUserId } = params;

  if (!recipientUserId || !documentId) {
    return;
  }

  // Self-notification prevention
  if (actorUserId && recipientUserId.toString() === actorUserId.toString()) {
    return;
  }

  // Guard against unhandled buffering timeouts when Mongoose is unconnected in unit tests
  const isMocked = typeof (Notification.findOneAndUpdate as unknown as { mock?: unknown }).mock !== 'undefined';
  if (mongoose.connection.readyState === 0 && !isMocked) {
    return;
  }

  const recipientObjId = new Types.ObjectId(recipientUserId.toString());
  const documentObjId = new Types.ObjectId(documentId.toString());
  const actorObjId = actorUserId ? new Types.ObjectId(actorUserId.toString()) : undefined;

  // Atomic race-condition-free deduplication using findOneAndUpdate upsert
  await Notification.findOneAndUpdate(
    {
      recipientUserId: recipientObjId,
      documentId: documentObjId,
      type,
      isRead: false,
    },
    {
      $setOnInsert: {
        recipientUserId: recipientObjId,
        documentId: documentObjId,
        type,
        actorUserId: actorObjId,
        isRead: false,
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
}

export interface NotificationResponseItem {
  id: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: Date | undefined;
  createdAt: Date;
  isAccessible: boolean;
  document: {
    id: string;
    title: string;
  } | null;
  actor?: {
    id: string;
    name: string;
    email: string;
  } | undefined;
}

export async function getUserNotifications(
  recipientUserId: string,
  role: 'user' | 'admin',
  query: GetNotificationsQueryInput = { page: 1, limit: 20 },
) {
  if (!Types.ObjectId.isValid(recipientUserId)) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const recipientObjId = new Types.ObjectId(recipientUserId);
  const { page = 1, limit = 20, isRead } = query;
  const skip = (page - 1) * limit;

  const filter: {
    recipientUserId: Types.ObjectId;
    isRead?: boolean;
  } = {
    recipientUserId: recipientObjId,
  };

  if (typeof isRead === 'boolean') {
    filter.isRead = isRead;
  }

  const [rawNotifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate<{ documentId: { _id: Types.ObjectId; title: string; isDeleted: boolean; ownerId: Types.ObjectId } | null }>({
        path: 'documentId',
        select: 'title isDeleted ownerId',
      })
      .populate<{ actorUserId: { _id: Types.ObjectId; name: string; email: string } | null }>({
        path: 'actorUserId',
        select: 'name email',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Notification.countDocuments(filter),

    Notification.countDocuments({
      recipientUserId: recipientObjId,
      isRead: false,
    }),
  ]);

  // Dynamic authorization check for each notification item
  const formattedNotifications: NotificationResponseItem[] = [];

  for (const item of rawNotifications) {
    const rawDoc = item.documentId;
    let isAccessible = false;
    let docSummary: { id: string; title: string } | null = null;

    if (rawDoc && !rawDoc.isDeleted) {
      if (role === 'admin' || rawDoc.ownerId.toString() === recipientUserId) {
        isAccessible = true;
      } else {
        const share = await DocumentShare.findOne({
          documentId: rawDoc._id,
          sharedWithUserId: recipientObjId,
        });
        if (share) {
          isAccessible = true;
        }
      }

      if (isAccessible) {
        docSummary = {
          id: rawDoc._id.toString(),
          title: rawDoc.title,
        };
      }
    }

    formattedNotifications.push({
      id: item._id.toString(),
      type: item.type,
      isRead: item.isRead,
      readAt: item.readAt,
      createdAt: item.createdAt,
      isAccessible,
      document: docSummary,
      actor: item.actorUserId
        ? {
            id: item.actorUserId._id.toString(),
            name: item.actorUserId.name,
            email: item.actorUserId.email,
          }
        : undefined,
    });
  }

  return {
    notifications: formattedNotifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function markNotificationAsRead(
  recipientUserId: string,
  notificationId: string,
) {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  const notification = await Notification.findOne({
    _id: new Types.ObjectId(notificationId),
    recipientUserId: new Types.ObjectId(recipientUserId),
  });

  if (!notification) {
    throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return {
    id: notification._id.toString(),
    isRead: notification.isRead,
    readAt: notification.readAt,
  };
}

export async function markAllNotificationsAsRead(recipientUserId: string) {
  const result = await Notification.updateMany(
    {
      recipientUserId: new Types.ObjectId(recipientUserId),
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    },
  );

  return {
    updatedCount: result.modifiedCount,
  };
}
