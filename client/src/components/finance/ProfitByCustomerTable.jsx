import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const ProfitByCustomerTable = ({ customers }) => {
  const format = (val) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-slate-800 text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-5">Customer Company</th>
              <th className="py-3 px-5 text-center">Code</th>
              <th className="py-3 px-5 text-right">Total Revenue</th>
              <th className="py-3 px-5 text-right">Total COGS</th>
              <th className="py-3 px-5 text-right">Gross Profit</th>
              <th className="py-3 px-5 text-center">Gross Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {(!customers || customers.length === 0) ? (
              <tr>
                <td colSpan="6" className="py-10 text-center text-slate-400">
                  No customer profitability analysis found.
                </td>
              </tr>
            ) : (
              customers.map((c, idx) => {
                const isPositive = c.profit >= 0;
                
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-3.5 px-5 font-bold text-slate-700">{c.customer}</td>
                    <td className="py-3.5 px-5 text-center font-mono font-bold text-slate-450">{c.code || 'N/A'}</td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-700">Rs {format(c.revenue)}</td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-500">Rs {format(c.cogs)}</td>
                    <td className={`py-3.5 px-5 text-right font-mono font-extrabold ${isPositive ? 'text-teal-650' : 'text-rose-650'}`}>
                      Rs {format(c.profit)}
                    </td>
                    <td className="py-3.5 px-5 text-center shrink-0">
                      <div className="flex items-center justify-center">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
                          isPositive
                            ? 'bg-teal-50 text-teal-700 border-teal-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {c.margin.toFixed(1)}%
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

export default ProfitByCustomerTable;
