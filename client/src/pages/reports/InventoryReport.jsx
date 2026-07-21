import React, { useState } from 'react';
import { Package, AlertTriangle, Boxes, DollarSign } from 'lucide-react';
import { useInventoryReport } from '../../hooks/useReports';
import ReportDataTable from '../../components/reports/ReportDataTable';

const InventoryReport = () => {
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const { data, isLoading, refetch } = useInventoryReport({
    lowStockOnly: lowStockOnly ? 'true' : undefined
  });

  const summary = data?.summary || { lineCount: 0, totalOnHand: 0, totalValue: 0, lowStockCount: 0 };
  const rows = (data?.rows || []).map((r) => ({
    sku: r.sku,
    name: r.name,
    warehouse: r.warehouse,
    quantityOnHand: r.quantityOnHand,
    quantityAvailable: r.quantityAvailable,
    stockValue: (r.stockValue || 0).toFixed(2),
    isLowStock: r.isLowStock ? 'Yes' : 'No'
  }));

  const columns = ['sku', 'name', 'warehouse', 'quantityOnHand', 'quantityAvailable', 'stockValue', 'isLowStock'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Inventory Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">Live warehouse stock levels and valuation.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-slate-300 text-teal-600"
            />
            Low stock only
          </label>
          <button
            type="button"
            onClick={() => refetch()}
            className="btn-secondary text-xs py-2 px-3"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Stock Lines', value: summary.lineCount, icon: Boxes, color: 'text-blue-600 bg-blue-50' },
          { label: 'Units On Hand', value: summary.totalOnHand?.toLocaleString(), icon: Package, color: 'text-teal-600 bg-teal-50' },
          { label: 'Stock Value', value: `LKR ${(summary.totalValue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Low Stock SKUs', value: summary.lowStockCount, icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' }
        ].map((card) => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color} mb-2`}>
              <card.icon size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
            <p className="text-lg font-extrabold text-slate-900 mt-1">{isLoading ? '—' : card.value}</p>
          </div>
        ))}
      </div>

      <ReportDataTable columns={columns} data={rows} defaultSortKey="sku" />
    </div>
  );
};

export default InventoryReport;
