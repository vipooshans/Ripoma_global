import React from 'react';
import { Briefcase, TrendingUp, DollarSign, Scale, Percent } from 'lucide-react';
import CurrencyAmountDisplay from './CurrencyAmountDisplay';

const PLSummaryCard = ({ summary, title = "Income Statement Snapshot" }) => {
  const formatPercent = (val) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  };

  const rows = [
    { label: 'Revenue', value: summary?.revenue, desc: 'Delivered export invoices sales' },
    { label: 'Cost of Goods Sold (COGS)', value: summary?.cogs, desc: 'Import purchases + pro-rated freight/customs' },
    { label: 'Gross Profit', value: summary?.grossProfit, desc: 'Revenue - COGS', highlight: true, margin: summary?.grossMargin },
    { label: 'Operating Expenses (OpEx)', value: summary?.operatingExpenses, desc: 'Salaries, office, agent fees, travel, audits' },
    { label: 'Taxes & Duties Paid', value: summary?.taxesPaid, desc: 'Customs duties & filed VAT paid' },
    { label: 'Net Profit', value: summary?.netProfit, desc: 'Gross Profit - OpEx - Taxes', highlight: true, margin: summary?.netMargin }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-extrabold text-slate-800 text-sm">{title}</h3>
        <p className="text-[10px] text-slate-450">Calculated overall profit performance in base currency.</p>
      </div>
      <div className="divide-y divide-slate-100 font-sans text-xs">
        {rows.map((row, idx) => {
          const isPositive = (row.value >= 0);
          
          return (
            <div 
              key={idx} 
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors duration-150 hover:bg-slate-50/30 ${
                row.highlight 
                  ? isPositive 
                    ? 'bg-teal-50/20 font-bold' 
                    : 'bg-rose-50/20 font-bold'
                  : ''
              }`}
            >
              <div>
                <p className="text-slate-800 font-bold">{row.label}</p>
                <p className="text-[9px] text-slate-450 mt-0.5 font-medium">{row.desc}</p>
              </div>
              <div className="text-left sm:text-right shrink-0 flex items-center gap-3">
                <div className="flex flex-col items-start sm:items-end">
                  <span className={`text-sm font-extrabold ${
                    row.highlight
                      ? isPositive ? 'text-teal-700' : 'text-rose-700'
                      : 'text-slate-800'
                  }`}>
                    <CurrencyAmountDisplay amount={row.value} />
                  </span>
                  
                  {row.margin !== undefined && (
                    <span className="text-[9px] text-slate-450 mt-0.5 font-bold flex items-center gap-0.5">
                      <Percent size={10} className="text-slate-450" />
                      {formatPercent(row.margin)} Margin
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PLSummaryCard;
