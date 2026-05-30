import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const TradeCorridorChart = ({ corridors = [] }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4 font-sans">
      <div>
        <h3 className="font-extrabold text-slate-800 text-sm">Top Trade Corridors</h3>
        <p className="text-[10px] text-slate-450">Active logistics routes by completed shipment count.</p>
      </div>

      <div className="h-[250px] w-full text-xs font-semibold">
        {corridors.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-450">
            No corridor shipment metrics recorded.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={corridors}
              layout="vertical"
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F8FAFC" />
              <XAxis type="number" stroke="#94A3B8" fontSize={9} tickLine={false} />
              <YAxis 
                dataKey="corridor" 
                type="category" 
                stroke="#94A3B8" 
                fontSize={8} 
                width={120} 
                tickLine={false} 
              />
              <Tooltip 
                contentStyle={{ fontSize: '11px', borderRadius: '8px', borderColor: '#E2E8F0', backgroundColor: '#FFF' }}
                formatter={(value) => [value, 'Shipments Volume']}
              />
              <Bar 
                dataKey="count" 
                fill="#1E3A5F" // Brand Navy
                radius={[0, 4, 4, 0]} 
                maxBarSize={18} 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TradeCorridorChart;
