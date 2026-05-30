import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

const WaterfallChart = ({ summary }) => {
  const revenue = summary?.revenue || 0;
  const cogs = summary?.cogs || 0;
  const grossProfit = summary?.grossProfit || 0;
  const opex = summary?.operatingExpenses || 0;
  const taxes = summary?.taxesPaid || 0;
  const netProfit = summary?.netProfit || 0;

  // Build the waterfall components.
  // start: height of invisible spacer bar.
  // size: height of active color bar.
  const data = [
    {
      name: 'Revenue',
      start: 0,
      size: revenue,
      displayVal: revenue,
      color: '#10B981' // Green
    },
    {
      name: 'COGS',
      start: Math.max(0, revenue - cogs),
      size: cogs,
      displayVal: -cogs,
      color: '#EF4444' // Red
    },
    {
      name: 'Gross Profit',
      start: 0,
      size: grossProfit,
      displayVal: grossProfit,
      color: '#0D9488' // Teal
    },
    {
      name: 'OpEx + Taxes',
      start: Math.max(0, grossProfit - (opex + taxes)),
      size: opex + taxes,
      displayVal: -(opex + taxes),
      color: '#F97316' // Orange
    },
    {
      name: 'Net Profit',
      start: 0,
      size: netProfit,
      displayVal: netProfit,
      color: '#6366F1' // Indigo
    }
  ];

  const format = (val) => {
    return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
      <div>
        <h3 className="font-extrabold text-slate-800 text-sm">P&L Waterfall Structure</h3>
        <p className="text-[10px] text-slate-450">Visual bridge of revenue deductions leading to net profit.</p>
      </div>

      <div className="h-[280px] w-full text-xs font-semibold">
        {revenue === 0 && cogs === 0 && opex === 0 ? (
          <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400">
            No P&L transactions to chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
              <YAxis 
                stroke="#94A3B8" 
                fontSize={9} 
                tickLine={false} 
                tickFormatter={(val) => `$${val.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{ fontSize: '11px', borderRadius: '8px', borderColor: '#E2E8F0' }}
                formatter={(value, name, props) => {
                  return [format(props.payload.displayVal), 'Amount'];
                }}
              />
              {/* Invisible spacer bar to float the waterfall blocks */}
              <Bar dataKey="start" stackId="a" fill="transparent" />
              {/* Colored active segment bar */}
              <Bar dataKey="size" stackId="a" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default WaterfallChart;
