import React from 'react';

const paymentConfig = {
  unpaid: { label: 'Unpaid', bg: 'bg-red-50 text-red-700 border-red-200' },
  partial: { label: 'Partially Paid', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { label: 'Paid', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

const PaymentStatusBadge = ({ status }) => {
  const config = paymentConfig[status] || { label: status, bg: 'bg-slate-100 text-slate-700' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}>
      {config.label}
    </span>
  );
};

export default PaymentStatusBadge;
