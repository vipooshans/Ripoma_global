import React from 'react';

export const TaxTypeBadge = ({ type }) => {
  const configs = {
    import_duty: { text: 'Import Duty', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    export_duty: { text: 'Export Duty', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    vat: { text: 'VAT', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
    gst: { text: 'GST', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    excise: { text: 'Excise', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    withholding_tax: { text: 'Withholding Tax', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    customs_fee: { text: 'Customs Fee', bg: 'bg-slate-50 text-slate-650 border-slate-200' },
    other: { text: 'Other Tax', bg: 'bg-slate-50 text-slate-500 border-slate-200' }
  };

  const config = configs[type] || configs.other;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${config.bg}`}>
      {config.text}
    </span>
  );
};

export const TaxStatusBadge = ({ status }) => {
  const configs = {
    pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    filed: { bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    paid: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-250' },
    disputed: { bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    exempt: { bg: 'bg-slate-50 text-slate-500 border-slate-200' }
  };

  const config = configs[status] || { bg: 'bg-slate-50 text-slate-500 border-slate-200' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${config.bg}`}>
      {status}
    </span>
  );
};
