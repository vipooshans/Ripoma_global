import React from 'react';
import { Lightbulb, AlertTriangle, TrendingUp, Info } from 'lucide-react';

const InsightCard = ({ text, type = 'info' }) => {
  const getInsightIcon = () => {
    switch (type) {
      case 'success':
        return <TrendingUp size={16} className="text-emerald-600" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-600" />;
      case 'info':
      default:
        return <Lightbulb size={16} className="text-teal-650" />;
    }
  };

  const getStyleClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50/50 border-emerald-200 text-emerald-900';
      case 'warning':
        return 'bg-amber-50/50 border-amber-200 text-amber-900';
      case 'info':
      default:
        return 'bg-teal-50/40 border-teal-200 text-slate-800';
    }
  };

  return (
    <div className={`border rounded-xl p-4 flex gap-3 shadow-sm transition-all leading-relaxed ${getStyleClasses()}`}>
      <div className="bg-white border border-slate-100 p-1.5 rounded-lg shadow-sm shrink-0 h-8 w-8 flex items-center justify-center">
        {getInsightIcon()}
      </div>
      <div className="font-sans text-xs font-semibold self-center">
        {text}
      </div>
    </div>
  );
};

export default InsightCard;
