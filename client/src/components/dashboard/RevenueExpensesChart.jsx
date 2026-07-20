import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const fmt = (v) => {
  if (v >= 1_000_000) return `Rs ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `Rs ${(v / 1_000).toFixed(0)}K`;
  return `Rs ${v}`;
};

const ChartSkeleton = () => (
  <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />
);

const RevenueExpensesChart = ({ data, loading }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Revenue vs. Expenses</h3>
          <p className="text-xs text-slate-500 mt-0.5">Last 6 months</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" />
            Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
            Expenses
          </span>
        </div>
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : (
        <div className="w-full min-w-0 h-[240px]">
          <ResponsiveContainer width="100%" height={240} minWidth={0} debounce={50}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FB7185" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#FB7185" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmt}
                tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value) => [fmt(value)]}
                contentStyle={{
                  borderRadius: '0.75rem',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  fontSize: '11px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#0D9488"
                strokeWidth={2.5}
                fill="url(#gradRevenue)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#FB7185"
                strokeWidth={2.5}
                fill="url(#gradExpenses)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default RevenueExpensesChart;
