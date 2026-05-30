import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

const FunnelChart = ({ data = [] }) => {
  // Pre-calculate centered values to create a funnel shape
  const maxVal = data[0]?.count || 1;
  const chartData = data.map(item => {
    const padding = (maxVal - item.count) / 2;
    return {
      stage: item.stage,
      count: item.count,
      pct: item.pct,
      // For centered layout
      paddingValue: padding,
      barValue: item.count
    };
  });

  const COLORS = ['#1E3A5F', '#0D9488', '#BA7517', '#639922'];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5 font-sans">
      <div>
        <h3 className="font-extrabold text-slate-800 text-sm">Order Conversion Funnel</h3>
        <p className="text-[10px] text-slate-450">Drop-off rate across order processing milestones.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left side: Funnel Visualization */}
        <div className="md:col-span-7 h-[200px] w-full text-xs font-semibold">
          {data.length === 0 || maxVal === 0 ? (
            <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-405">
              No sales pipeline statistics.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData}
                layout="vertical"
                stackOffset="sign"
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis dataKey="stage" type="category" stroke="#94A3B8" fontSize={9} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                  formatter={(value, name, props) => {
                    if (name === 'barValue') return [value, 'Orders Count'];
                    return null;
                  }}
                />
                {/* Centering padding */}
                <Bar dataKey="paddingValue" stackId="a" fill="transparent" legendType="none" />
                {/* Actual value bar */}
                <Bar dataKey="barValue" stackId="a" radius={4}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right side: Numerical Percentages */}
        <div className="md:col-span-5 space-y-3 font-sans text-xs">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/50 transition-all">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full shrink-0" 
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="font-bold text-slate-700">{item.stage}</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-slate-900">{item.count}</span>
                <span className="block text-[9px] text-slate-400 uppercase font-extrabold">{item.pct}% Conversion</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FunnelChart;
