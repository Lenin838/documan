import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../features/notifications/notification.api';
import type {
  NotificationItem,
  NotificationType,
} from '../features/notifications/notification.types';

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'REVIEW_REQUESTED':
      return '📝';
    case 'REVIEW_APPROVED':
      return '✅';
    case 'CHANGES_REQUESTED':
      return '⚠️';
    case 'UPSTREAM_STALE':
      return '⚠️';
    case 'UPSTREAM_DEPRECATED':
      return '⛔';
    case 'DOCUMENT_SHARED':
      return '🔗';
    default:
      return '🔔';
  }
}

function getNotificationMessage(item: NotificationItem): string {
  const actorName = item.actor?.name || 'A team member';
  switch (item.type) {
    case 'REVIEW_REQUESTED':
      return `${actorName} requested your review`;
    case 'REVIEW_APPROVED':
      return `${actorName} approved your review request`;
    case 'CHANGES_REQUESTED':
      return `${actorName} requested changes`;
    case 'UPSTREAM_STALE':
      return 'Upstream dependency is marked as STALE';
    case 'UPSTREAM_DEPRECATED':
      return 'Upstream dependency is marked as DEPRECATED';
    case 'DOCUMENT_SHARED':
      return `${actorName} shared a document with you`;
    default:
      return 'Document notification';
  }
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        setLoading(true);
        const res = await getNotifications(1, 10);
        if (isMounted) {
          setNotifications(res.data.notifications);
          setUnreadCount(res.data.unreadCount);
        }
      } catch {
        // Ignore errors silently for notification bell poll
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleMarkAsRead(item: NotificationItem) {
    if (!item.isRead) {
      try {
        await markNotificationAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Ignore failure
      }
    }

    if (item.isAccessible && item.document) {
      setIsOpen(false);
      navigate(`/documents/${item.document.id}`);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore error
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          padding: '0.4rem 0.8rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <span>🔔</span>
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: 'white',
              borderRadius: '9999px',
              padding: '0.1rem 0.45rem',
              fontSize: '0.75rem',
              fontWeight: 'bold',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            width: '360px',
            maxHeight: '420px',
            backgroundColor: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
            }}
          >
            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
              Notifications ({unreadCount} unread)
            </strong>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllAsRead()}
                style={{
                  fontSize: '0.75rem',
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Mark all read
              </button>
            )}
          </header>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && notifications.length === 0 ? (
              <p style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                Loading notifications...
              </p>
            ) : notifications.length === 0 ? (
              <p style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                No notifications yet
              </p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => void handleMarkAsRead(item)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: item.isRead ? '#ffffff' : '#f0f9ff',
                    cursor: item.isAccessible ? 'pointer' : 'default',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>
                    {getNotificationIcon(item.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: item.isRead ? 'normal' : 'bold', color: '#1e293b' }}>
                      {getNotificationMessage(item)}
                    </div>
                    {item.isAccessible && item.document ? (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#2563eb',
                          marginTop: '0.2rem',
                          fontWeight: 'bold',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        📄 {item.document.title}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem', fontStyle: 'italic' }}>
                        Document (Access Revoked)
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!item.isRead && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        marginTop: '0.3rem',
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
