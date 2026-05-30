import React from 'react';

export const PaymentTypeBadge = ({ type }) => {
  if (type === 'inbound') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-250">
        Inbound
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-250">
      Outbound
    </span>
  );
};

export const PaymentStatusBadge = ({ status }) => {
  const configs = {
    pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    failed: { bg: 'bg-rose-50 text-rose-750 border-rose-205' },
    cancelled: { bg: 'bg-slate-50 text-slate-500 border-slate-200' },
    refunded: { bg: 'bg-purple-50 text-purple-700 border-purple-200' }
  };

  const config = configs[status] || { bg: 'bg-slate-50 text-slate-500 border-slate-200' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${config.bg}`}>
      {status}
    </span>
  );
};
