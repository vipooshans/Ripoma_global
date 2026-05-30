import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Loader2 } from 'lucide-react';

const actionColor = (action) => {
  if (!action) return 'bg-slate-100 text-slate-500';
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('add')) return 'bg-emerald-100 text-emerald-700';
  if (a.includes('delete') || a.includes('cancel')) return 'bg-rose-100 text-rose-700';
  if (a.includes('update') || a.includes('edit')) return 'bg-blue-100 text-blue-700';
  if (a.includes('approve')) return 'bg-violet-100 text-violet-700';
  if (a.includes('login') || a.includes('logout')) return 'bg-slate-100 text-slate-600';
  return 'bg-amber-100 text-amber-700';
};

const ActivityFeed = ({ data, loading }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-teal-500" />
        <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-teal-500" />
        </div>
      ) : !data?.logs?.length ? (
        <p className="text-xs text-slate-400 text-center py-8">No recent activity found.</p>
      ) : (
        <div className="space-y-3">
          {data.logs.map((log, idx) => (
            <div key={log._id || idx} className="flex items-start gap-3">
              {/* Avatar or initial */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-xs mt-0.5">
                {log.performedBy?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">
                    {log.performedBy?.name || 'Unknown User'}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${actionColor(log.action)}`}>
                    {log.action}
                  </span>
                  {log.resourceType && (
                    <span className="text-[10px] text-slate-400 font-medium truncate">
                      {log.resourceType}
                    </span>
                  )}
                </div>
                {log.description && (
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{log.description}</p>
                )}
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">
                {log.createdAt
                  ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
