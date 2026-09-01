import { Schema, model, Types, type Document as MongooseDocument } from 'mongoose';

export type NotificationType =
  | 'REVIEW_REQUESTED'
  | 'REVIEW_APPROVED'
  | 'CHANGES_REQUESTED'
  | 'UPSTREAM_STALE'
  | 'UPSTREAM_DEPRECATED'
  | 'DOCUMENT_SHARED';

export interface NotificationDocument extends MongooseDocument {
  recipientUserId: Types.ObjectId;
  documentId: Types.ObjectId;
  type: NotificationType;
  actorUserId?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'REVIEW_REQUESTED',
        'REVIEW_APPROVED',
        'CHANGES_REQUESTED',
        'UPSTREAM_STALE',
        'UPSTREAM_DEPRECATED',
        'DOCUMENT_SHARED',
      ],
      required: true,
      index: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    isRead: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    readAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Index for Paginated Queries: recipientUserId + isRead + createdAt
notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });

// Atomic Partial Unique Index for Unread Deduplication (Prevents Concurrent Duplicate Race Conditions)
notificationSchema.index(
  { recipientUserId: 1, documentId: 1, type: 1 },
  { unique: true, partialFilterExpression: { isRead: false } },
);

export const Notification = model<NotificationDocument>(
  'Notification',
  notificationSchema,
);
