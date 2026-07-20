import React from 'react';

const ReceivablesAgeingTable = ({ details = [], summary = {}, title = 'Ageing Analysis' }) => {
  
  const getBucketBadge = (bucket) => {
    switch (bucket) {
      case 'not_yet_due':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Current</span>;
      case '0-30d':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100">0–30 Days</span>;
      case '31-60d':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">31–60 Days</span>;
      case '61-90d':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">61–90 Days</span>;
      case '90d_plus':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/10 text-red-750 border border-red-900/20">90d+ Overdue</span>;
      default:
        return null;
    }
  };

  const format = (val) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden font-sans space-y-4 p-5">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-slate-800 text-sm">{title}</h3>
        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
          Total Owed: Rs {format(summary.total)}
        </span>
      </div>

      {/* Ageing Summary Card Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 bg-slate-50 border border-slate-150 rounded-xl p-4 text-center">
        <div>
          <p className="text-[9px] text-slate-450 font-extrabold uppercase tracking-wider">Current</p>
          <p className="text-xs font-mono font-extrabold text-slate-650 mt-1">Rs {format(summary.not_yet_due)}</p>
        </div>
        <div>
          <p className="text-[9px] text-teal-650 font-extrabold uppercase tracking-wider">0–30 Days</p>
          <p className="text-xs font-mono font-extrabold text-teal-650 mt-1">Rs {format(summary['0-30d'])}</p>
        </div>
        <div>
          <p className="text-[9px] text-amber-600 font-extrabold uppercase tracking-wider">31–60 Days</p>
          <p className="text-xs font-mono font-extrabold text-amber-600 mt-1">Rs {format(summary['31-60d'])}</p>
        </div>
        <div>
          <p className="text-[9px] text-rose-600 font-extrabold uppercase tracking-wider">61–90 Days</p>
          <p className="text-xs font-mono font-extrabold text-rose-650 mt-1">Rs {format(summary['61-90d'])}</p>
        </div>
        <div>
          <p className="text-[9px] text-red-800 font-extrabold uppercase tracking-wider">90d+ Overdue</p>
          <p className="text-xs font-mono font-extrabold text-red-850 mt-1">Rs {format(summary['90d_plus'])}</p>
        </div>
      </div>

      {/* Details Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-slate-800 text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="py-2.5 px-4">Counterparty</th>
              <th className="py-2.5 px-4">Reference ID</th>
              <th className="py-2.5 px-4 text-right">Owed Amount</th>
              <th className="py-2.5 px-4">Due Date</th>
              <th className="py-2.5 px-4 text-center">Days Past Due</th>
              <th className="py-2.5 px-4 text-center">Ageing Bracket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {details.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-slate-400 font-semibold">
                  No outstanding items recorded. All accounts settled.
                </td>
              </tr>
            ) : (
              details.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-700">{item.customerName || item.counterpartyName}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-500">{item.invoiceNumber || item.paymentNumber}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">Rs {format(item.amount)}</td>
                  <td className="py-3 px-4 font-semibold text-slate-500">
                    {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-extrabold text-slate-600">{item.daysOverdue} d</td>
                  <td className="py-3 px-4 text-center">{getBucketBadge(item.bucket)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceivablesAgeingTable;
