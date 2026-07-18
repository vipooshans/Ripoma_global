import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useNotifications, 
  useUnreadCount, 
  useMarkNotificationRead, 
  useMarkAllNotificationsRead 
} from '../../hooks/useNotifications';
import { getNotificationStyle } from '../../constants/notificationTypes';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Fetch unread count and latest notifications
  const { data: countData, refetch: refetchCount } = useUnreadCount();
  const { data: listData, isLoading, refetch: refetchList } = useNotifications({ page: 1, limit: 10 });
  const { data: criticalData } = useNotifications({ page: 1, limit: 5, severity: 'error', isRead: false });

  const markReadMut = useMarkNotificationRead();
  const markAllReadMut = useMarkAllNotificationsRead();

  const unreadCount = countData?.count || 0;
  const notifications = listData?.notifications || [];
  const criticalNotifications = criticalData?.notifications || [];

  // Compute severity counts from loaded page
  const stats = notifications.reduce((acc, n) => {
    if (!n.isRead) {
      acc[n.severity] = (acc[n.severity] || 0) + 1;
    }
    return acc;
  }, { info: 0, success: 0, warning: 0, error: 0 });

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMut.mutateAsync();
      refetchCount();
      refetchList();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markReadMut.mutateAsync(notif._id);
      refetchCount();
      refetchList();
    }
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                {unreadCount} Unread
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time status updates, system events, operational alerts, and compliance flags.
          </p>
        </div>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all duration-200"
            >
              Mark All as Read
            </button>
          )}
          <button
            onClick={() => navigate('/notifications/centre')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-teal-600/20 transition-all duration-200"
          >
            View All Notifications
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Errors</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.error}</h3>
            </div>
            <span className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">🚨</span>
          </div>
          <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${stats.error > 0 ? 100 : 0}%` }}></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Warnings</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.warning}</h3>
            </div>
            <span className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">⚠️</span>
          </div>
          <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${stats.warning > 0 ? 100 : 0}%` }}></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-sky-500/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operational Info</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.info}</h3>
            </div>
            <span className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400">ℹ️</span>
          </div>
          <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${stats.info > 0 ? 100 : 0}%` }}></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Success Updates</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.success}</h3>
            </div>
            <span className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">✅</span>
          </div>
          <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.success > 0 ? 100 : 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Log - 2 Cols */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Recent Notifications</h2>
            <button 
              onClick={() => navigate('/notifications/centre')}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
            >
              View All Logged
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 py-20 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notif) => {
                const styleConfig = getNotificationStyle(notif.type, notif.severity);
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 border rounded-xl cursor-pointer hover:border-teal-500/40 transition-all duration-150 flex items-start space-x-3.5 ${
                      notif.isRead 
                        ? 'bg-slate-900/40 border-slate-800/80 opacity-70' 
                        : 'bg-slate-850/30 border-slate-800 shadow-md shadow-slate-950/20'
                    }`}
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      <span className={`inline-flex items-center justify-center h-9 w-9 rounded-lg text-lg ${styleConfig.color}`}>
                        {styleConfig.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold truncate ${notif.isRead ? 'text-slate-450' : 'text-slate-200'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                          {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {notif.body}
                      </p>
                      {notif.entityRef && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700/50">
                            Ref: {notif.entityRef}
                          </span>
                          {notif.actionUrl && (
                            <span className="text-[10px] text-teal-400 hover:underline">
                              Follow link &rarr;
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 py-20 text-center">
              <p className="text-sm text-slate-450">No recent notifications logged.</p>
            </div>
          )}
        </div>

        {/* Side Panel - 1 Col */}
        <div className="space-y-6">
          {/* Critical Warnings Pending */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              Critical Actions
              {criticalNotifications.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              )}
            </h2>

            {criticalNotifications.length > 0 ? (
              <div className="space-y-3.5">
                {criticalNotifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg hover:border-rose-500/30 transition-all cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-rose-450">{notif.title}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{notif.body}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-rose-400 font-semibold hover:underline">Resolve &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-lg">
                <p className="text-xs text-slate-450">Zero critical unresolved items!</p>
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-bold text-white mb-4">Operations Shortcuts</h2>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => navigate('/notifications/reminders')}
                className="w-full p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800/80 rounded-lg text-xs font-semibold text-slate-350 hover:text-white text-left transition-colors flex items-center justify-between"
              >
                <span>📅 Manage Task Reminders</span>
                <span className="text-teal-400">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
