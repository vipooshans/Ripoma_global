import React from 'react';

const DeliveryCalendarEvent = ({ event }) => {
  const statusColors = {
    draft: 'bg-slate-400/20 text-slate-700 border-slate-400/30',
    pending_approval: 'bg-amber-500/20 text-amber-800 border-amber-500/30',
    approved: 'bg-blue-500/20 text-blue-800 border-blue-500/30',
    ordered: 'bg-teal-500/20 text-teal-850 border-teal-500/30',
    in_transit: 'bg-purple-500/20 text-purple-800 border-purple-500/30',
    partially_received: 'bg-orange-500/20 text-orange-800 border-orange-500/30',
    received: 'bg-emerald-500/20 text-emerald-800 border-emerald-500/30',
    cancelled: 'bg-rose-500/20 text-rose-800 border-rose-500/30'
  };

  const statusClass = statusColors[event.status] || 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <div className="flex flex-col gap-0.5 text-[10px] leading-tight font-semibold py-0.5">
      <div className="truncate font-bold text-white">{event.title}</div>
      <div className="flex items-center justify-between gap-1 text-[8px] font-medium">
        <span className="text-teal-200 font-extrabold">${event.grandTotal?.toLocaleString()}</span>
        <span className={`px-1 rounded uppercase border whitespace-nowrap ${statusClass}`}>
          {event.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
};

export default DeliveryCalendarEvent;
