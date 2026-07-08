import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
export const KpiCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="h-10 w-10 rounded-xl bg-slate-100" />
      <div className="h-5 w-16 rounded-full bg-slate-100" />
    </div>
    <div className="h-7 w-28 rounded bg-slate-100 mb-2" />
    <div className="h-3 w-20 rounded bg-slate-100" />
  </div>
);

// ── Single KPI card ───────────────────────────────────────────────────────────
const KpiCard = ({
  icon: Icon,
  iconBg = 'bg-teal-50',
  iconColor = 'text-teal-600',
  label,
  value,
  badge,
  badgeColor = 'bg-slate-100 text-slate-600',
  trendPercent,
  link,
}) => {
  const Wrapper = link ? Link : 'div';
  const wrapperProps = link ? { to: link } : {};

  const TrendIcon =
    trendPercent === undefined || trendPercent === null || trendPercent === 0
      ? Minus
      : trendPercent > 0
      ? TrendingUp
      : TrendingDown;

  const trendColor =
    trendPercent === undefined || trendPercent === null || trendPercent === 0
      ? 'text-slate-400'
      : trendPercent > 0
      ? 'text-emerald-600'
      : 'text-rose-500';

  return (
    <Wrapper
      {...wrapperProps}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5"
    >
      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        {badge !== undefined && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-extrabold text-slate-800 leading-none tracking-tight">
          {value}
        </p>
        <p className="text-xs text-slate-500 font-medium mt-1.5">{label}</p>
      </div>

      {/* Trend row */}
      {trendPercent !== undefined && trendPercent !== null && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
          <TrendIcon size={13} />
          <span>
            {Math.abs(trendPercent)}% vs last month
          </span>
        </div>
      )}
    </Wrapper>
  );
};

export default KpiCard;
