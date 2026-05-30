import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useNotifications, 
  useUnreadCount, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead 
} from '../../hooks/useNotifications';
import { getNotificationStyle } from '../../constants/notificationTypes';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Fetch count and recent unread notifications
  const { data: countData } = useUnreadCount();
  const { data: listData } = useNotifications({ page: 1, limit: 5, isRead: false });
  
  const markReadMut = useMarkNotificationRead();
  const markAllReadMut = useMarkAllNotificationsRead();

  const unreadCount = countData?.count || 0;
  const recentNotifications = listData?.notifications || [];

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.isRead) {
      await markReadMut.mutateAsync(notif._id);
    }
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMut.mutateAsync();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-800/50 rounded-lg transition-all duration-200 focus:outline-none"
        aria-label="View notifications"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[10px] font-bold text-white items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-sm">Recent Alerts</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllReadMut.isPending}
                className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List items */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-850">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((notif) => {
                const styleConfig = getNotificationStyle(notif.type, notif.severity);
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className="p-4 hover:bg-slate-850/50 cursor-pointer transition-colors duration-150 flex items-start space-x-3"
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      <span className={`inline-flex items-center justify-center h-8 w-8 rounded-lg text-lg ${styleConfig.color}`}>
                        {styleConfig.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-250 truncate flex items-center gap-1">
                        {notif.title}
                        {notif.severity === 'error' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1.5">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 px-4 text-center">
                <svg
                  className="mx-auto h-8 w-8 text-slate-650"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v2m.64 5.64l1.42 1.42M18.36 5.64l-1.42 1.42M6 20h12"
                  />
                </svg>
                <p className="mt-2 text-xs text-slate-400">All caught up! No unread alerts.</p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="bg-slate-900 border-t border-slate-800 grid grid-cols-2 text-center text-xs divide-x divide-slate-800">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications/centre');
              }}
              className="py-3 text-slate-450 hover:text-slate-200 transition-colors font-medium"
            >
              Alert Centre
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications/settings');
              }}
              className="py-3 text-slate-450 hover:text-slate-200 transition-colors font-medium"
            >
              Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
