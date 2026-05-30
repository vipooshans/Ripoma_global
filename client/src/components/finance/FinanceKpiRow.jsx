import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle 
} from 'lucide-react';
import CurrencyAmountDisplay from './CurrencyAmountDisplay';

const FinanceKpiRow = ({ kpiData, plSummary, isLoading }) => {
  const format = (val) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const cards = [
    // Row 1: MTD Aggregates
    {
      title: 'Total Revenue (MTD)',
      value: plSummary?.revenue || 0,
      desc: 'Delivered export orders',
      icon: ArrowUpRight,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      isCurrency: true
    },
    {
      title: 'Total COGS (MTD)',
      value: plSummary?.cogs || 0,
      desc: 'Procured imports + logistics expense',
      icon: ArrowDownRight,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      isCurrency: true
    },
    {
      title: 'Gross Profit (MTD)',
      value: plSummary?.grossProfit || 0,
      desc: `Gross margin: ${format(plSummary?.grossMargin)}%`,
      icon: TrendingUp,
      color: (plSummary?.grossProfit >= 0) 
        ? 'text-teal-600 bg-teal-50 border-teal-100' 
        : 'text-rose-600 bg-rose-50 border-rose-100',
      isCurrency: true
    },
    // Row 2: Outstanding Balance & Net Cash
    {
      title: 'Total Receivables',
      value: kpiData?.totalReceivables || 0,
      desc: 'Inbound pending payments',
      icon: DollarSign,
      color: 'text-teal-700 bg-teal-50 border-teal-200',
      isCurrency: true,
      alertBadge: kpiData?.overdueReceivables > 0 ? {
        text: `${format(kpiData.overdueReceivables)} overdue`,
        color: 'bg-rose-100 text-rose-800'
      } : null
    },
    {
      title: 'Total Payables',
      value: kpiData?.totalPayables || 0,
      desc: 'Outbound pending payments',
      icon: DollarSign,
      color: 'text-coral-700 bg-orange-50 border-orange-200',
      isCurrency: true,
      alertBadge: kpiData?.overduePayables > 0 ? {
        text: `${format(kpiData.overduePayables)} overdue`,
        color: 'bg-rose-100 text-rose-800 animate-pulse'
      } : null
    },
    {
      title: 'Net Cash Position',
      value: kpiData?.netCashPosition || 0,
      desc: 'Completed inbound - outbound cash',
      icon: (kpiData?.netCashPosition >= 0) ? TrendingUp : TrendingDown,
      color: (kpiData?.netCashPosition >= 0) 
        ? 'text-emerald-700 bg-emerald-50/50 border-emerald-200' 
        : 'text-rose-700 bg-rose-50/50 border-rose-200',
      isCurrency: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bg-white border rounded-xl p-5 shadow-sm flex items-center justify-between gap-4 transition-all duration-200 hover:shadow-md ${
            idx >= 3 ? 'border-slate-200' : 'border-slate-200/85'
          }`}
        >
          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {card.title}
            </span>
            
            {isLoading ? (
              <div className="h-7 w-28 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  <CurrencyAmountDisplay amount={card.value} />
                </span>
                
                {card.alertBadge && (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-tight ${card.alertBadge.color}`}>
                    <AlertTriangle size={10} />
                    {card.alertBadge.text}
                  </span>
                )}
              </div>
            )}
            
            <p className="text-[10px] text-slate-500 font-medium truncate">
              {card.desc}
            </p>
          </div>
          
          <div className={`p-3 rounded-lg shrink-0 border ${card.color}`}>
            <card.icon size={20} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default FinanceKpiRow;
