import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const ProfitByOrderTable = ({ orders }) => {
  const format = (val) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-slate-800 text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-5">Order #</th>
              <th className="py-3 px-5 text-center">Type</th>
              <th className="py-3 px-5">Counterparty</th>
              <th className="py-3 px-5 text-right">Revenue</th>
              <th className="py-3 px-5 text-right">COGS</th>
              <th className="py-3 px-5 text-right">Net Profit</th>
              <th className="py-3 px-5 text-center">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {(!orders || orders.length === 0) ? (
              <tr>
                <td colSpan="7" className="py-10 text-center text-slate-400">
                  No order analysis records found.
                </td>
              </tr>
            ) : (
              orders.map((o, idx) => {
                const isImport = o.type === 'import';
                const isPositive = o.profit >= 0;
                
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-3 px-5 font-mono font-bold text-teal-650">{o.orderNumber}</td>
                    <td className="py-3 px-5 text-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold capitalize ${
                        isImport 
                          ? 'bg-sky-55 text-sky-750 border border-sky-200' 
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {o.type}
                      </span>
                    </td>
                    <td className="py-3 px-5 font-semibold text-slate-700 truncate max-w-[150px]">{o.counterparty}</td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-slate-700">
                      LKR {format(isImport ? o.expectedRevenue : o.revenue)}
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-slate-500">LKR {format(o.cogs)}</td>
                    <td className={`py-3 px-5 text-right font-mono font-extrabold ${isPositive ? 'text-teal-650' : 'text-rose-650'}`}>
                      LKR {format(o.profit)}
                    </td>
                    <td className="py-3 px-5 text-center shrink-0">
                      <div className="flex items-center justify-center">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
                          isPositive
                            ? 'bg-teal-50 text-teal-700 border-teal-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {o.margin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfitByOrderTable;
