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
    <div ref={dropdownRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1e293b] hover:border-[#334155] bg-[#191f31] hover:bg-[#1e293b] text-slate-300 hover:text-slate-100 text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8]"
      >
        <span className="text-sm leading-none" aria-hidden="true">🔔</span>
        <span className="hidden sm:inline">Notifications</span>
        {unreadCount > 0 && (
          <span
            className="bg-[#f43f5e] text-white rounded-[2px] px-1.5 py-0.5 text-[10px] font-mono font-bold leading-none min-w-[18px] text-center shadow-sm"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-[110%] w-[360px] max-h-[420px] bg-[#191f31] border border-[#1e293b] rounded-[6px] shadow-2xl z-50 flex flex-col overflow-hidden text-slate-100"
        >
          <header
            className="px-4 py-3 border-b border-[#1e293b] flex justify-between items-center bg-[#191f31]/90"
          >
            <strong className="text-xs font-semibold text-slate-200">
              Notifications ({unreadCount} unread)
            </strong>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllAsRead()}
                className="text-xs text-[#38bdf8] hover:text-[#7dd3fc] font-medium hover:underline bg-transparent border-0 p-0 cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </header>

          <div className="overflow-y-auto flex-1 divide-y divide-[#1e293b]/60">
            {loading && notifications.length === 0 ? (
              <p className="p-4 text-center text-slate-400 text-xs">
                Loading notifications...
              </p>
            ) : notifications.length === 0 ? (
              <p className="p-6 text-center text-slate-400 text-xs">
                No notifications yet
              </p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => void handleMarkAsRead(item)}
                  className={`p-3 text-xs transition-colors flex gap-3 items-start ${
                    item.isRead
                      ? "bg-[#191f31] hover:bg-[#1e293b]/60 text-slate-300"
                      : "bg-[#0c4a6e]/20 hover:bg-[#0c4a6e]/30 text-slate-100"
                  } ${item.isAccessible ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    {getNotificationIcon(item.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs ${item.isRead ? "font-normal text-slate-300" : "font-semibold text-slate-100"}`}>
                      {getNotificationMessage(item)}
                    </div>
                    {item.isAccessible && item.document ? (
                      <div className="text-xs text-[#38bdf8] hover:text-[#7dd3fc] mt-1 font-semibold truncate">
                        📄 {item.document.title}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic mt-1">
                        Document (Access Revoked)
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 mt-1">
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!item.isRead && (
                    <span
                      className="w-2 h-2 rounded-full bg-[#38bdf8] mt-1 shrink-0"
                      aria-hidden="true"
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
