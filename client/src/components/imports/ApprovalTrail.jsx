import React from 'react';
import { ShieldCheck } from 'lucide-react';

const ApprovalTrail = ({ approvals = [], requiredLevels = 1, grandTotal = 0 }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
          <ShieldCheck size={16} className="text-teal-600" />
          <span>Approvals Trail Status</span>
        </h3>
        <p className="text-[10px] text-slate-450 mt-0.5 font-semibold">
          Order value is <strong className="font-bold">Rs {grandTotal?.toLocaleString()}</strong>, triggering a{' '}
          <strong>{requiredLevels}-level approval Gate</strong>.
        </p>
      </div>

      {/* Steps trail indicator */}
      <div className="space-y-4 font-semibold text-xs text-slate-700">
        {[...Array(requiredLevels)].map((_, idx) => {
          const level = idx + 1;
          const appRecord = approvals.find(a => a.level === level);

          let statusText = 'Pending Approval';
          let borderClass = 'border-slate-200 bg-slate-50/50';
          let textClass = 'text-slate-400';

          if (appRecord) {
            if (appRecord.action === 'approved') {
              statusText = `Approved by ${appRecord.approver?.name || 'User'}`;
              borderClass = 'border-emerald-200 bg-emerald-50/30';
              textClass = 'text-emerald-700';
            } else {
              statusText = `Rejected by ${appRecord.approver?.name || 'User'}`;
              borderClass = 'border-red-200 bg-red-50/30';
              textClass = 'text-red-700';
            }
          }

          return (
            <div key={level} className={`border p-4 rounded-xl flex items-start gap-3.5 ${borderClass}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                appRecord
                  ? appRecord.action === 'approved'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-red-100 border-red-300 text-red-700'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {level}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-baseline">
                  <h4 className={`font-bold ${textClass}`}>Level {level} gate</h4>
                  {appRecord && (
                    <span className="text-[10px] text-slate-450 font-normal">
                      {new Date(appRecord.actionedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-slate-700 mt-1">{statusText}</p>
                {appRecord?.comments && (
                  <p className="text-[11px] text-slate-500 italic mt-1.5 bg-white/75 p-2 rounded-lg border border-slate-100">
                    "{appRecord.comments}"
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalTrail;
