import React from 'react';

const StatsKpiRow = ({ cards = [], loading = false }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {cards.map((card, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{card.title}</span>
          {loading ? (
            <div className="h-7 w-24 bg-slate-100 animate-pulse rounded mt-1.5" />
          ) : (
            <p className={`text-2xl font-extrabold mt-1 tracking-tight ${card.alert === 'over_limit' ? 'text-rose-600' : card.alert === 'near_limit' ? 'text-amber-600' : 'text-slate-900'}`}>
              {card.value}
            </p>
          )}
          {card.desc && <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">{card.desc}</p>}
        </div>
        <div className={`p-3 rounded-lg shrink-0 ${card.colorClass || 'text-teal-600 bg-teal-50'}`}>
          {card.icon && <card.icon size={20} />}
        </div>
      </div>
    ))}
  </div>
);

export default StatsKpiRow;
