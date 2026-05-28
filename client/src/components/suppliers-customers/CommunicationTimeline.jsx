import React, { useState } from 'react';
import { format } from 'date-fns';
import { Mail, Phone, Calendar, FileText, MessageCircle, MoreHorizontal, CheckCircle2, PlusCircle, Filter } from 'lucide-react';
import { useCommunications, useMarkFollowUpDone, useDeleteCommunication } from '../../hooks/useCommunications';
import LogCommunicationSlideOver from './LogCommunicationSlideOver';
import toast from 'react-hot-toast';

const TYPE_ICONS = {
  email: Mail,
  call: Phone,
  meeting: Calendar,
  note: FileText,
  whatsapp: MessageCircle,
  other: MoreHorizontal
};

const TYPE_COLORS = {
  email: 'text-blue-600 bg-blue-50 border-blue-100',
  call: 'text-green-600 bg-green-50 border-green-100',
  meeting: 'text-purple-600 bg-purple-50 border-purple-100',
  note: 'text-slate-600 bg-slate-50 border-slate-200',
  whatsapp: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  other: 'text-slate-500 bg-slate-50 border-slate-200'
};

const DIR_COLORS = {
  inbound: 'bg-teal-50 text-teal-700 border-teal-200',
  outbound: 'bg-blue-50 text-blue-700 border-blue-200',
  internal: 'bg-slate-100 text-slate-600 border-slate-200'
};

const CommunicationTimeline = ({ entityType, entityId }) => {
  const [showLog, setShowLog] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [dirFilter, setDirFilter] = useState('');

  const { data, isLoading, refetch } = useCommunications({ entityType, entityId, type: typeFilter || undefined, direction: dirFilter || undefined });
  const markDone = useMarkFollowUpDone();
  const deleteLog = useDeleteCommunication();

  const logs = data?.logs || [];

  const handleMarkDone = async (id) => {
    try {
      await markDone.mutateAsync(id);
      toast.success('Follow-up marked as done.');
    } catch { toast.error('Failed.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this log entry?')) return;
    try {
      await deleteLog.mutateAsync(id);
      toast.success('Log deleted.');
    } catch { toast.error('Failed.'); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <Filter size={13} className="text-slate-400" />
          <select className="form-select py-1 px-2 text-xs" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {['email', 'call', 'meeting', 'note', 'whatsapp', 'other'].map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <select className="form-select py-1 px-2 text-xs" value={dirFilter} onChange={e => setDirFilter(e.target.value)}>
            <option value="">All Directions</option>
            {['inbound', 'outbound', 'internal'].map(d => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowLog(true)}
          className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shrink-0"
        >
          <PlusCircle size={13} /> Log Communication
        </button>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-3 py-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold">
          No communications logged yet. Click "Log Communication" to add the first entry.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const TypeIcon = TYPE_ICONS[log.type] || MoreHorizontal;
            const typeColor = TYPE_COLORS[log.type] || TYPE_COLORS.other;
            const dirColor = DIR_COLORS[log.direction] || DIR_COLORS.internal;
            const isPendingFollowUp = log.followUpDate && !log.followUpDone;

            return (
              <div key={log._id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-sm hover:shadow-md transition-shadow">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg border ${typeColor}`}>
                      <TypeIcon size={14} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`border px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${typeColor}`}>
                          {log.type}
                        </span>
                        <span className={`border px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${dirColor}`}>
                          {log.direction}
                        </span>
                      </div>
                      {log.subject && (
                        <p className="font-extrabold text-slate-800 text-xs mt-0.5 leading-tight">{log.subject}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDelete(log._id)}
                      className="p-1 text-slate-300 hover:text-rose-500 rounded text-[10px]"
                      title="Delete"
                    >✕</button>
                  </div>
                </div>

                {/* Body */}
                {log.body && (
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{log.body}</p>
                )}

                {/* Follow-up pill */}
                {isPendingFollowUp && (
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Follow-up due: {format(new Date(log.followUpDate), 'MMM d, yyyy')}
                    </span>
                    <button
                      onClick={() => handleMarkDone(log._id)}
                      className="text-[10px] font-bold text-teal-650 hover:text-teal-800 flex items-center gap-0.5"
                    >
                      <CheckCircle2 size={11} /> Mark Done
                    </button>
                  </div>
                )}
                {log.followUpDone && log.followUpDate && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                    <CheckCircle2 size={11} className="text-teal-500" /> Follow-up completed
                  </span>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2 mt-1">
                  <span>by {log.loggedBy?.name || 'System'}</span>
                  <span>{format(new Date(log.createdAt), 'MMM d, yyyy · h:mm a')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showLog && (
        <LogCommunicationSlideOver
          entityType={entityType}
          entityId={entityId}
          onClose={() => { setShowLog(false); refetch(); }}
        />
      )}
    </div>
  );
};

export default CommunicationTimeline;
