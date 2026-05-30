import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useNotifications, 
  useMarkNotificationRead, 
  useDismissNotification, 
  useMarkAllNotificationsRead 
} from '../../hooks/useNotifications';
import { getNotificationStyle, NOTIFICATION_TYPES } from '../../constants/notificationTypes';

const Centre = () => {
  const navigate = useNavigate();
  const [filterRead, setFilterRead] = useState('all'); // 'all', 'unread', 'read'
  const [filterSeverity, setFilterSeverity] = useState(''); // '', 'info', 'success', 'warning', 'error'
  const [filterType, setFilterType] = useState(''); // '' or type code
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Build params
  const params = {
    page: currentPage,
    limit: itemsPerPage
  };
  if (filterRead === 'unread') params.isRead = 'false';
  if (filterRead === 'read') params.isRead = 'true';
  if (filterSeverity) params.severity = filterSeverity;
  if (filterType) params.type = filterType;

  // Fetch list
  const { data, isLoading, refetch } = useNotifications(params);
  
  const markReadMut = useMarkNotificationRead();
  const dismissMut = useDismissNotification();
  const markAllReadMut = useMarkAllNotificationsRead();

  const notifications = data?.notifications || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.pages || 1;

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markReadMut.mutateAsync(notif._id);
      refetch();
    }
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      await markReadMut.mutateAsync(id);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (e, id) => {
    e.stopPropagation();
    try {
      await dismissMut.mutateAsync(id);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMut.mutateAsync();
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Breadcrumb / Header */}
      <div className="mb-6">
        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
          <span className="hover:text-slate-350 cursor-pointer" onClick={() => navigate('/notifications')}>Control Centre</span>
          <span>/</span>
          <span className="text-slate-300">Alert Centre</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Alert Centre</h1>
            <p className="text-slate-400 text-xs mt-0.5">Explore, search and manage historical system and operations events.</p>
          </div>
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Status Tabs */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
          <div className="bg-slate-950 p-0.5 rounded-lg border border-slate-850 flex text-xs">
            <button
              onClick={() => handleFilterChange(setFilterRead, 'all')}
              className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
                filterRead === 'all' ? 'bg-teal-650 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange(setFilterRead, 'unread')}
              className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
                filterRead === 'unread' ? 'bg-teal-650 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => handleFilterChange(setFilterRead, 'read')}
              className={`flex-1 py-1.5 text-center font-medium rounded-md transition-colors ${
                filterRead === 'read' ? 'bg-teal-650 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Read
            </button>
          </div>
        </div>

        {/* Severity filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Severity</label>
          <select
            value={filterSeverity}
            onChange={(e) => handleFilterChange(setFilterSeverity, e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs rounded-lg p-2 focus:ring-1 focus:ring-teal-500 outline-none"
          >
            <option value="">All Severities</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Critical Error</option>
          </select>
        </div>

        {/* Type filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Alert Type</label>
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(setFilterType, e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs rounded-lg p-2 focus:ring-1 focus:ring-teal-500 outline-none"
          >
            <option value="">All Alert Types</option>
            {Object.entries(NOTIFICATION_TYPES).map(([code, config]) => (
              <option key={code} value={code}>
                {config.icon} {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications Grid */}
      {isLoading ? (
        <div className="py-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
        </div>
      ) : notifications.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {notifications.map((notif) => {
              const styleConfig = getNotificationStyle(notif.type, notif.severity);
              return (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border rounded-xl hover:border-teal-500/40 cursor-pointer flex items-start space-x-3.5 group transition-all duration-200 ${
                    notif.isRead 
                      ? 'bg-slate-900/30 border-slate-850 opacity-60' 
                      : 'bg-slate-900 border-slate-800 shadow-lg shadow-slate-950/20'
                  }`}
                >
                  <div className="flex-shrink-0 pt-0.5">
                    <span className={`inline-flex items-center justify-center h-10 w-10 rounded-lg text-xl ${styleConfig.color}`}>
                      {styleConfig.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className={`text-xs font-bold ${notif.isRead ? 'text-slate-400' : 'text-slate-200'}`}>
                        {notif.title}
                      </h3>
                      <span className="text-[10px] text-slate-500 ml-2">
                        {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {notif.body}
                    </p>
                    
                    <div className="mt-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {notif.entityRef && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-450 border border-slate-700/50">
                            Ref: {notif.entityRef}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          notif.severity === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          notif.severity === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          notif.severity === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}>
                          {notif.severity}
                        </span>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.isRead && (
                          <button
                            onClick={(e) => handleMarkRead(e, notif._id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[10px] text-slate-300 rounded hover:text-white"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDismiss(e, notif._id)}
                          className="px-2 py-1 bg-slate-850 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/30 text-[10px] text-slate-450 hover:text-rose-400 rounded"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs">
              <span className="text-slate-450">
                Showing page <strong className="text-slate-200">{currentPage}</strong> of <strong className="text-slate-200">{totalPages}</strong> ({totalItems} alerts)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-250 disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-250 disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-24 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-sm text-slate-450">No notifications match your current filter selections.</p>
        </div>
      )}
    </div>
  );
};

export default Centre;
