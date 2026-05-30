import React from 'react';

export const ExpenseStatusBadge = ({ status }) => {
  const configs = {
    draft: { bg: 'bg-slate-50 text-slate-500 border-slate-200' },
    submitted: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    approved: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-250' },
    rejected: { bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    paid: { bg: 'bg-teal-50 text-teal-700 border-teal-200' }
  };

  const config = configs[status] || { bg: 'bg-slate-50 text-slate-500 border-slate-200' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${config.bg}`}>
      {status}
    </span>
  );
};

export const ExpensePaymentStatusBadge = ({ paymentStatus }) => {
  if (paymentStatus === 'paid') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
        Paid
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 text-slate-600 border border-slate-250">
      Unpaid
    </span>
  );
};
