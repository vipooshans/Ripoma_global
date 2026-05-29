import React from 'react';

const priorityConfig = {
  low: { label: 'Low', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  normal: { label: 'Normal', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  high: { label: 'High', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  urgent: { label: 'Urgent', bg: 'bg-red-50 text-red-700 border-red-200 font-bold animate-pulse' }
};

const PriorityBadge = ({ priority }) => {
  const config = priorityConfig[priority] || { label: priority, bg: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.bg}`}>
      {config.label}
    </span>
  );
};

export default PriorityBadge;
