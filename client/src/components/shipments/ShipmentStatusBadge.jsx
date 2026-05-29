import React from 'react';

const statusConfig = {
  scheduled: {
    label: 'Scheduled',
    bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/60',
    dot: 'bg-slate-400'
  },
  in_transit: {
    label: 'In Transit',
    bg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/25 dark:text-sky-300 dark:border-sky-800/60',
    dot: 'bg-sky-500 animate-pulse'
  },
  at_port: {
    label: 'At Port',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/25 dark:text-indigo-300 dark:border-indigo-800/60',
    dot: 'bg-indigo-500'
  },
  customs: {
    label: 'In Customs',
    bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/25 dark:text-purple-300 dark:border-purple-800/60',
    dot: 'bg-purple-500'
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/25 dark:text-amber-300 dark:border-amber-800/60',
    dot: 'bg-amber-500 animate-bounce'
  },
  delivered: {
    label: 'Delivered',
    bg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/25 dark:text-teal-300 dark:border-teal-800/60',
    dot: 'bg-teal-500'
  },
  exception: {
    label: 'Exception/Alert',
    bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/25 dark:text-rose-300 dark:border-rose-800/60',
    dot: 'bg-rose-500 animate-ping'
  }
};

const ShipmentStatusBadge = ({ status }) => {
  const normalized = (status || 'scheduled').toLowerCase();
  const config = statusConfig[normalized] || statusConfig.scheduled;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export default ShipmentStatusBadge;
