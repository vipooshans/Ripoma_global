import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const ChartSkeleton = () => (
  <div className="h-56 bg-slate-50 animate-pulse rounded-xl" />
);

const IMPORT_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#A78BFA'];
const EXPORT_COLORS = ['#94A3B8', '#2DD4BF', '#F97316', '#10B981'];

const OrderPipelineChart = ({ data, loading }) => {
  const importData = data
    ? [
        { name: 'Draft', value: data.import.draft },
        { name: 'Approved', value: data.import.approved },
        { name: 'In Transit', value: data.import.inTransit },
        { name: 'Received', value: data.import.received },
      ]
    : [];

  const exportData = data
    ? [
        { name: 'Draft', value: data.export.draft },
        { name: 'Confirmed', value: data.export.confirmed },
        { name: 'Dispatched', value: data.export.dispatched },
        { name: 'Delivered', value: data.export.delivered },
      ]
    : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">Order Pipeline</h3>
        <p className="text-xs text-slate-500 mt-0.5">Import & export status distribution</p>
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Import pipeline */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
              Imports
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={importData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #E2E8F0',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="value" name="Orders" radius={[4, 4, 0, 0]}>
                  {importData.map((_, i) => (
                    <Cell key={i} fill={IMPORT_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Export pipeline */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
              Exports
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={exportData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #E2E8F0',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="value" name="Orders" radius={[4, 4, 0, 0]}>
                  {exportData.map((_, i) => (
                    <Cell key={i} fill={EXPORT_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPipelineChart;
