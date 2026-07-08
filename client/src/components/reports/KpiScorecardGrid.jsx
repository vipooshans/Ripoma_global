import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, FileText, Percent } from 'lucide-react';

const KpiScorecardGrid = ({ kpiData, isLoading }) => {
  const formatValue = (key, val) => {
    if (val === undefined || val === null) return 'N/A';
    if (key === 'revenue' || key === 'expenses') {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (key === 'grossMargin') {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString();
  };

  const getCardIcon = (key) => {
    const classes = "h-5 w-5";
    switch (key) {
      case 'revenue':
        return <DollarSign className={`${classes} text-teal-600`} />;
      case 'orders':
        return <FileText className={`${classes} text-navy-500`} />;
      case 'expenses':
        return <DollarSign className={`${classes} text-rose-600`} />;
      case 'grossMargin':
        return <Percent className={`${classes} text-teal-600`} />;
      default:
        return <DollarSign className={`${classes}`} />;
    }
  };

  const getCardBg = (key) => {
    switch (key) {
      case 'revenue':
      case 'grossMargin':
        return 'bg-teal-50/50 border-teal-100';
      case 'orders':
        return 'bg-slate-50/50 border-slate-100';
      case 'expenses':
        return 'bg-rose-50/30 border-rose-100';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const metrics = [
    { key: 'revenue', label: 'Revenue MTD', data: kpiData?.revenue },
    { key: 'orders', label: 'Total Orders MTD', data: kpiData?.orders },
    { key: 'expenses', label: 'Expenses MTD', data: kpiData?.expenses },
    { key: 'grossMargin', label: 'Gross Margin %', data: kpiData?.grossMargin }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-28 animate-pulse flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="h-3.5 bg-slate-200 rounded w-24"></div>
              <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
            </div>
            <div className="h-6 bg-slate-200 rounded w-16 mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map(metric => {
        const val = metric.data?.value;
        const growth = metric.data?.growth || 0;
        const isPositive = growth >= 0;

        return (
          <div 
            key={metric.key} 
            className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group ${getCardBg(metric.key)}`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                {metric.label}
              </span>
              <div className="p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm group-hover:scale-105 transition-transform">
                {getCardIcon(metric.key)}
              </div>
            </div>
            
            <div className="flex items-end justify-between mt-4">
              <span className="text-xl font-mono font-extrabold text-slate-800 tracking-tight leading-none">
                {formatValue(metric.key, val)}
              </span>
              
              {metric.data && (
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold font-sans border ${
                  isPositive 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                  {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  <span>{isPositive ? '+' : ''}{growth.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KpiScorecardGrid;
