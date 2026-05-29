import React from 'react';
import { AlertTriangle } from 'lucide-react';

const DelayPill = ({ isDelayed, delayDays, reason }) => {
  if (!isDelayed) return null;

  return (
    <span 
      className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded text-xs font-semibold select-none group relative cursor-help"
      title={reason || 'Schedule delayed'}
    >
      <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
      <span>
        {delayDays > 0 ? `+${delayDays} day${delayDays > 1 ? 's' : ''}` : 'Delayed'}
      </span>
      
      {reason && (
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-slate-900 text-slate-100 text-[10px] p-2 rounded shadow-lg z-30 font-normal leading-tight">
          {reason}
        </span>
      )}
    </span>
  );
};

export default DelayPill;
