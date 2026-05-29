import React, { useEffect, useState } from 'react';
import { Activity, Download, Upload, Eye, Trash2, RefreshCw, Loader } from 'lucide-react';
import { useDocumentActivity } from '../../hooks/useDocumentActivity';

const ACTION_CONFIG = {
  uploaded: { icon: Upload, color: 'text-teal-400', bg: 'bg-teal-500/10' },
  downloaded: { icon: Download, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  viewed: { icon: Eye, color: 'text-slate-400', bg: 'bg-slate-700' },
  deleted: { icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10' },
  restored: { icon: RefreshCw, color: 'text-green-400', bg: 'bg-green-500/10' },
  version_added: { icon: Upload, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  renamed: { icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  relinked: { icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  shared: { icon: Activity, color: 'text-pink-400', bg: 'bg-pink-500/10' },
};

const ActivityLog = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const { activities, pagination, loading, fetchActivity } = useDocumentActivity(null);

  useEffect(() => {
    fetchActivity(page);
  }, [page, fetchActivity]);

  const actionTypes = ['uploaded', 'downloaded', 'viewed', 'deleted', 'restored', 'version_added', 'renamed'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Activity size={22} className="text-teal-400" /> Activity Log
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Full audit trail of all document operations across RIPOMA</p>
        </div>
        <button onClick={() => fetchActivity(page)}
          className="p-2.5 rounded-xl border border-slate-700 text-slate-500 hover:text-teal-400 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Action filter pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActionFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border
            ${!actionFilter ? 'border-teal-500 bg-teal-500/20 text-teal-400' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
          All
        </button>
        {actionTypes.map(action => {
          const config = ACTION_CONFIG[action] || {};
          return (
            <button key={action} onClick={() => setActionFilter(a => a === action ? '' : action)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors border
                ${actionFilter === action
                  ? `border-teal-500 ${config.bg} ${config.color}`
                  : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
              {action.replace(/_/g, ' ')}
            </button>
          );
        })}
      </div>

      {/* Activity feed */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700/50">
        {loading && (
          <div className="flex justify-center py-16 text-teal-400">
            <Loader size={28} className="animate-spin" />
          </div>
        )}

        {!loading && activities.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Activity size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No activity recorded yet</p>
          </div>
        )}

        {!loading && activities
          .filter(act => !actionFilter || act.action === actionFilter)
          .map((act, idx) => {
            const config = ACTION_CONFIG[act.action] || ACTION_CONFIG.viewed;
            const Icon = config.icon;
            return (
              <div key={idx} className="flex items-start gap-4 p-4 hover:bg-slate-700/30 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon size={16} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                    <span className="font-semibold text-slate-200">
                      {act.performedBy?.firstName} {act.performedBy?.lastName}
                    </span>
                    <span className={`font-medium capitalize ${config.color}`}>
                      {act.action?.replace(/_/g, ' ')}
                    </span>
                    {act.document && (
                      <span className="text-slate-500">·</span>
                    )}
                    {act.document && (
                      <span className="text-slate-400 truncate">
                        {act.document.name}
                        {act.document.docNumber && <span className="text-slate-600 ml-1 text-xs">({act.document.docNumber})</span>}
                      </span>
                    )}
                  </div>
                  {act.details && <p className="text-xs text-slate-500 mt-0.5 italic">{act.details}</p>}
                  <p className="text-xs text-slate-600 mt-1">{new Date(act.createdAt).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm disabled:opacity-40 hover:border-teal-500/50 transition-colors">
            ← Prev
          </button>
          <span className="text-xs text-slate-500">Page {page} of {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm disabled:opacity-40 hover:border-teal-500/50 transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
