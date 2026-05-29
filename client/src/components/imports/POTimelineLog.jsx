import React from 'react';
import { History } from 'lucide-react';

const POTimelineLog = ({ events = [] }) => {
  return (
    <div className="space-y-6">
      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
        <History size={16} className="text-teal-660" />
        <span>Purchase Order Timeline Logs</span>
      </h3>

      {events.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold bg-white/50">
          No logs recorded yet.
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-100 ml-3.5 pl-6 space-y-6 text-xs font-semibold text-slate-700">
          {events.map((evt, idx) => (
            <div key={idx} className="relative">
              {/* Circle marker */}
              <div className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-teal-500 border-2 border-white ring-4 ring-teal-50 shadow-sm" />
              <div>
                <div className="flex justify-between items-baseline gap-4">
                  <h4 className="font-bold text-slate-900">{evt.title}</h4>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {new Date(evt.date || evt.actionedAt || evt.receivedAt || evt.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-500 mt-0.5">{evt.desc || evt.comments}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default POTimelineLog;
