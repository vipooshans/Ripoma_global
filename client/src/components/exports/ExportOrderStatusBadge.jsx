import React from 'react';

const statusConfig = {
  draft: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  processing: { label: 'Processing', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  ready_to_ship: { label: 'Ready to Ship', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  dispatched: { label: 'Dispatched', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  in_transit: { label: 'In Transit', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  delivered: { label: 'Delivered', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50 text-red-700 border-red-200' },
  returned: { label: 'Returned', bg: 'bg-orange-50 text-orange-700 border-orange-200' }
};

const ExportOrderStatusBadge = ({ status }) => {
  const config = statusConfig[status] || { label: status, bg: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}>
      {config.label}
    </span>
  );
};

export default ExportOrderStatusBadge;
