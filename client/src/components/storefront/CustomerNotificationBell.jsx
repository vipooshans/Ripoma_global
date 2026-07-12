import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import storefrontService from '../../services/storefront.service';

const CustomerNotificationBell = ({ iconBtnClass }) => {
  const { isAuthenticated } = useContext(CustomerAuthContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const refreshCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnread(0);
      return;
    }
    try {
      const data = await storefrontService.getUnreadNotificationCount();
      setUnread(data.count || 0);
    } catch {
      /* ignore */
    }
  }, [isAuthenticated]);

  const loadRecent = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await storefrontService.getMyNotifications(8);
      setItems(data.notifications || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCount();
    if (!isAuthenticated) return undefined;
    const id = setInterval(refreshCount, 60000);
    return () => clearInterval(id);
  }, [isAuthenticated, refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    loadRecent();
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, loadRecent]);

  if (!isAuthenticated) return null;

  const handleOpen = () => setOpen((v) => !v);

  const handleItemClick = async (n) => {
    if (!n.isRead) {
      try {
        await storefrontService.markNotificationRead(n.id);
        setUnread((c) => Math.max(0, c - 1));
        setItems((list) =>
          list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
        );
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    if (n.actionUrl) navigate(n.actionUrl);
  };

  const handleMarkAll = async () => {
    try {
      await storefrontService.markAllNotificationsRead();
      setUnread(0);
      setItems((list) => list.map((x) => ({ ...x, isRead: true })));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        className={iconBtnClass}
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-40">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-extrabold text-slate-800">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-teal-500" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8 px-4">No notifications yet.</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors ${
                        !n.isRead ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{n.title}</p>
                      {n.body && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/customer/profile?tab=notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-bold text-teal-600 hover:bg-teal-50 py-3 border-t border-slate-100"
          >
            View all in Account
          </Link>
        </div>
      )}
    </div>
  );
};

export default CustomerNotificationBell;
