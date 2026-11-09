'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Bell, Megaphone, AlertTriangle, CheckCircle2, Info, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { 
  getNotificationsAction, 
  markAllNotificationsReadAction, 
  markNotificationReadAction,
  NotificationItem 
} from '@/lib/notifications/actions';

function formatTimeAgo(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'announcements' | 'specific'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await getNotificationsAction();
      if (res.success) {
        setItems(res.data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    });
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      startTransition(async () => {
        await markNotificationReadAction(item.id);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i))
        );
      });
    }
  };

  const unreadCount = items.filter((i) => !i.isRead).length;
  const announcementsCount = items.filter((i) => i.isAnnouncement).length;
  const specificCount = items.filter((i) => !i.isAnnouncement).length;

  const filteredItems = items.filter((item) => {
    if (filter === 'announcements') return item.isAnnouncement;
    if (filter === 'specific') return !item.isAnnouncement;
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button 
        onClick={() => {
          if (!isOpen) fetchNotifications();
          setIsOpen(!isOpen);
        }}
        className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100 focus:outline-none"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center text-[10px] font-bold text-white bg-blue-600 rounded-full border-2 border-white animate-in zoom-in-75">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden origin-top-right transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 bg-white">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilter('announcements')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                filter === 'announcements'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Megaphone className="w-3 h-3" />
              Announcements ({announcementsCount})
            </button>
            <button
              onClick={() => setFilter('specific')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filter === 'specific'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Direct ({specificCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100">
            {isLoading && items.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs text-gray-400">Loading notifications...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                <div className="w-12 h-12 bg-gray-50 border border-gray-200/80 rounded-full flex items-center justify-center mb-3 text-gray-400 shadow-inner">
                  {filter === 'announcements' ? (
                    <Megaphone className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Bell className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {filter === 'announcements'
                    ? 'No announcements yet'
                    : filter === 'specific'
                    ? 'No direct notifications'
                    : "You're all caught up"}
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
                  {filter === 'announcements'
                    ? 'Platform announcements will appear here when posted.'
                    : 'System alerts and activity updates will be delivered here.'}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isAnnouncement = item.isAnnouncement;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`relative p-3.5 transition-colors cursor-pointer group ${
                      !item.isRead ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-gray-50'
                    } ${isAnnouncement ? 'border-l-3 border-amber-500' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="shrink-0 mt-0.5">
                        {isAnnouncement ? (
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                            <Megaphone className="w-4 h-4" />
                          </div>
                        ) : item.type === 'alert' ? (
                          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : item.type === 'success' ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                            <Info className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isAnnouncement ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 rounded-md">
                                <Sparkles className="w-2.5 h-2.5" />
                                Announcement
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold text-gray-600 bg-gray-100 rounded-md">
                                Direct
                              </span>
                            )}
                            {item.title && (
                              <span className="text-xs font-semibold text-gray-900 truncate">
                                {item.title}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 shrink-0">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>

                        {/* Message */}
                        <p className="text-xs text-gray-700 leading-relaxed break-words">
                          {item.message}
                        </p>

                        {/* Optional Link */}
                        {item.link && (
                          <div className="mt-2">
                            <Link
                              href={item.link}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                              }}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                            >
                              View details →
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Unread indicator dot */}
                      {!item.isRead && (
                        <div className="shrink-0 mt-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600 block shadow-xs" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>Pingr Alerts & Announcements</span>
            <button
              onClick={fetchNotifications}
              className="hover:text-gray-900 font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
