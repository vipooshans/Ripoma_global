import React from 'react';

const CreditUtilisationBar = ({ outstandingBalance = 0, creditLimit = 0 }) => {
  if (!creditLimit || creditLimit === 0) return (
    <p className="text-xs text-slate-400 font-medium">No credit limit set.</p>
  );

  const pct = Math.min(100, Math.round((outstandingBalance / creditLimit) * 100));
  const isOver = pct >= 100;
  const isNear = pct >= 80;

  const barColor = isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-teal-500';
  const textColor = isOver ? 'text-rose-600' : isNear ? 'text-amber-600' : 'text-teal-650';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-slate-500">Credit Utilisation</span>
        <span className={textColor}>{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-semibold text-slate-400">
        <span>Outstanding: ${outstandingBalance.toLocaleString()}</span>
        <span>Limit: ${creditLimit.toLocaleString()}</span>
      </div>
      {isOver && (
        <p className="text-[10px] text-rose-600 font-extrabold">⚠ Over credit limit. Immediate action required.</p>
      )}
      {isNear && !isOver && (
        <p className="text-[10px] text-amber-600 font-bold">⚠ Approaching credit limit (≥80%).</p>
      )}
    </div>
  );
};

export default CreditUtilisationBar;
