export type NotificationType =
  | 'REVIEW_REQUESTED'
  | 'REVIEW_APPROVED'
  | 'CHANGES_REQUESTED'
  | 'UPSTREAM_STALE'
  | 'UPSTREAM_DEPRECATED'
  | 'DOCUMENT_SHARED';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  isAccessible: boolean;
  document: {
    id: string;
    title: string;
  } | null;
  actor?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface GetNotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MarkReadResponse {
  id: string;
  isRead: boolean;
  readAt: string;
}

export interface MarkAllReadResponse {
  updatedCount: number;
}
