import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';

import { Notification } from './notification.model.js';
import { DocumentShare } from '../document-shares/document-share.model.js';
import {
  createNotificationInternal,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  safeNotify,
} from './notification.service.js';

vi.mock('./notification.model.js', () => ({
  Notification: {
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../document-shares/document-share.model.js', () => ({
  DocumentShare: {
    findOne: vi.fn(),
  },
}));

vi.mock('../documents/document.model.js', () => ({
  Document: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe('notification.service', () => {
  const recipientId = new Types.ObjectId().toString();
  const actorId = new Types.ObjectId().toString();
  const docId = new Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotificationInternal & safeNotify', () => {
    it('should ignore self-notifications', async () => {
      await createNotificationInternal({
        recipientUserId: actorId,
        documentId: docId,
        type: 'REVIEW_REQUESTED',
        actorUserId: actorId,
      });

      expect(Notification.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should perform atomic upsert for deduplication', async () => {
      await createNotificationInternal({
        recipientUserId: recipientId,
        documentId: docId,
        type: 'REVIEW_REQUESTED',
        actorUserId: actorId,
      });

      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        {
          recipientUserId: expect.anything(),
          documentId: expect.anything(),
          type: 'REVIEW_REQUESTED',
          isRead: false,
        },
        {
          $setOnInsert: {
            recipientUserId: expect.anything(),
            documentId: expect.anything(),
            type: 'REVIEW_REQUESTED',
            actorUserId: expect.anything(),
            isRead: false,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
    });

    it('should isolate notification failure with safeNotify without throwing', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('DB write failure'));
      await expect(safeNotify(failingFn)).resolves.not.toThrow();
      expect(failingFn).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should return accessible document data when recipient has access', async () => {
      const notifId = new Types.ObjectId();
      const mockQueryChain = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            _id: notifId,
            type: 'REVIEW_REQUESTED',
            isRead: false,
            createdAt: new Date(),
            documentId: {
              _id: new Types.ObjectId(docId),
              title: 'Test Document',
              isDeleted: false,
              ownerId: new Types.ObjectId(recipientId),
            },
            actorUserId: {
              _id: new Types.ObjectId(actorId),
              name: 'Actor User',
              email: 'actor@example.com',
            },
          },
        ]),
      };

      vi.mocked(Notification.find).mockReturnValue(mockQueryChain as unknown as never);
      vi.mocked(Notification.countDocuments).mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      const result = await getUserNotifications(recipientId, 'user');

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]?.isAccessible).toBe(true);
      expect(result.notifications[0]?.document).toEqual({
        id: docId,
        title: 'Test Document',
      });
      expect(result.unreadCount).toBe(1);
    });

    it('should return document: null and isAccessible: false when access is revoked (anti-leakage)', async () => {
      const notifId = new Types.ObjectId();
      const otherOwnerId = new Types.ObjectId().toString();
      const mockQueryChain = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            _id: notifId,
            type: 'REVIEW_REQUESTED',
            isRead: false,
            createdAt: new Date(),
            documentId: {
              _id: new Types.ObjectId(docId),
              title: 'Secret Spec Title',
              isDeleted: false,
              ownerId: new Types.ObjectId(otherOwnerId),
            },
            actorUserId: null,
          },
        ]),
      };

      vi.mocked(Notification.find).mockReturnValue(mockQueryChain as unknown as never);
      vi.mocked(Notification.countDocuments).mockResolvedValueOnce(1).mockResolvedValueOnce(1);
      vi.mocked(DocumentShare.findOne).mockResolvedValue(null);

      const result = await getUserNotifications(recipientId, 'user');

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]?.isAccessible).toBe(false);
      expect(result.notifications[0]?.document).toBeNull();
    });
  });

  describe('markNotificationAsRead & markAllNotificationsAsRead', () => {
    it('should mark single notification as read if recipient matches', async () => {
      const notifId = new Types.ObjectId().toString();
      const mockSave = vi.fn().mockResolvedValue(true);
      const mockNotif = {
        _id: new Types.ObjectId(notifId),
        recipientUserId: new Types.ObjectId(recipientId),
        isRead: false,
        readAt: undefined as Date | undefined,
        save: mockSave,
      };

      vi.mocked(Notification.findOne).mockResolvedValue(mockNotif as unknown as never);

      const result = await markNotificationAsRead(recipientId, notifId);

      expect(mockNotif.isRead).toBe(true);
      expect(mockNotif.readAt).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });

    it('should throw 404 if notification belongs to another user (anti-IDOR)', async () => {
      const notifId = new Types.ObjectId().toString();
      vi.mocked(Notification.findOne).mockResolvedValue(null);

      await expect(markNotificationAsRead(recipientId, notifId)).rejects.toThrow(
        'Notification not found',
      );
    });

    it('should mark all unread notifications as read for current user', async () => {
      vi.mocked(Notification.updateMany).mockResolvedValue({ modifiedCount: 5 } as never);

      const result = await markAllNotificationsAsRead(recipientId);

      expect(result.updatedCount).toBe(5);
      expect(Notification.updateMany).toHaveBeenCalledWith(
        {
          recipientUserId: new Types.ObjectId(recipientId),
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: expect.any(Date),
          },
        },
      );
    });
  });
});
