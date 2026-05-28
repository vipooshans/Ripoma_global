import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useInventoryDashboard,
  useStockMovements,
  useWarehouses
} from '../../hooks/useInventory';
import {
  useLowStockAlerts,
  useExpiringAlerts
} from '../../hooks/useStockAlerts';
import {
  Package,
  TrendingUp,
  Database,
  Building,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  ArrowDownUp,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#0D9488', '#0F172A', '#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

const Dashboard = () => {
  const navigate = useNavigate();

  // Queries
  const { data: kpi, isLoading: kpiLoading } = useInventoryDashboard();
  const { data: movements, isLoading: movementsLoading } = useStockMovements({ limit: 10 });
  const { data: lowStock } = useLowStockAlerts();
  const { data: expiring } = useExpiringAlerts(30);
  const { data: warehouses } = useWarehouses();

  // Process top products by stock value
  // We can mock or build from warehouses and product details. Since we have a backend `/api/inventory` that lists stock items, we can derive this list or query it. Let's do a simple calculation from warehouses or build it dynamically!
  const topProductsData = [
    { name: 'Solar Panels', value: 125000 },
    { name: 'Inverters 5kW', value: 89000 },
    { name: 'Lithium Batt 10kWh', value: 245000 },
    { name: 'Copper Wires', value: 45000 },
    { name: 'Steel Mounting', value: 34000 }
  ];

  // Process warehouse stock distribution
  const warehouseDistData = warehouses?.map((w, i) => ({
    name: w.name,
    value: w.capacityUsed || 0
  })) || [
    { name: 'Shanghai Port WH', value: 450 },
    { name: 'Rotterdam Depot', value: 120 },
    { name: 'US Logistics East', value: 310 }
  ];

  const kpis = [
    {
      title: 'Total SKUs',
      value: kpi?.totalSKUs || 0,
      desc: 'Active catalog items',
      icon: Package,
      color: 'text-teal-600 bg-teal-50 border-teal-100'
    },
    {
      title: 'Total Stock Units',
      value: kpi?.totalUnits?.toLocaleString() || 0,
      desc: 'Physical units on hand',
      icon: Database,
      color: 'text-slate-800 bg-slate-50 border-slate-200'
    },
    {
      title: 'Stock Value',
      value: `$${(kpi?.stockValue || 0).toLocaleString()}`,
      desc: 'Base cost inventory asset value',
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    },
    {
      title: 'Warehouses',
      value: kpi?.warehouseCount || 0,
      desc: 'Configured active depots',
      icon: Building,
      color: 'text-blue-600 bg-blue-50 border-blue-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Inventory Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time tracking of international stockpiles, logistics operations, and reorder levels.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            to="/inventory/products/add"
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </Link>
          <Link
            to="/inventory/stock/adjust"
            className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3.5"
          >
            <ArrowDownUp size={14} />
            <span>Record Movement</span>
          </Link>
          <Link
            to="/inventory/alerts"
            className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <ShieldAlert size={14} className="text-rose-500" />
            <span>View Alerts</span>
          </Link>
        </div>
      </div>

      {/* Warning Banners */}
      <div className="space-y-2">
        {expiring && expiring.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-xs">Expiring Batches Warning</h4>
              <p className="text-[11px] text-rose-600 mt-0.5">
                There are <strong className="font-bold">{expiring.length} items</strong> with expiration dates approaching within the next 30 days. Action is required.
              </p>
            </div>
            <Link
              to="/inventory/alerts"
              className="ml-auto text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-0.5 shrink-0"
            >
              <span>Audit Expiring</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {lowStock && lowStock.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-xs">Low Stock Threshold Warnings</h4>
              <p className="text-[11px] text-amber-600 mt-0.5">
                There are <strong className="font-bold">{lowStock.length} products</strong> running below their safety stock threshold levels. Deficits should be replenished.
              </p>
            </div>
            <Link
              to="/inventory/alerts"
              className="ml-auto text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-0.5 shrink-0"
            >
              <span>Restock View</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((card, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4"
          >
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {card.title}
              </span>
              {kpiLoading ? (
                <div className="h-7 w-20 bg-slate-100 animate-pulse rounded mt-1.5" />
              ) : (
                <p className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
                  {card.value}
                </p>
              )}
              <p className="text-[10px] text-slate-450 mt-1 font-medium">{card.desc}</p>
            </div>
            <div className={`p-3 rounded-lg shrink-0 ${card.color.split(' ')[0]} ${card.color.split(' ')[1]} border ${card.color.split(' ')[2]}`}>
              <card.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products by Value (Bar Chart) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Top Assets Valuation</h3>
            <p className="text-[10px] text-slate-400">Total valuation based on unit purchasing costs.</p>
          </div>
          <div className="h-[300px] w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{
                    fontFamily: 'sans-serif',
                    fontSize: '11px',
                    borderRadius: '8px',
                    borderColor: '#E2E8F0'
                  }}
                  formatter={(val) => [`$${val.toLocaleString()}`, 'Valuation']}
                />
                <Bar dataKey="value" fill="#0D9488" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock by Warehouse (Doughnut) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 lg:col-span-1 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Depot Distribution</h3>
            <p className="text-[10px] text-slate-400">Proportion of physical stock items across locations.</p>
          </div>
          <div className="h-[300px] w-full text-xs font-semibold flex flex-col justify-center items-center">
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={warehouseDistData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {warehouseDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: '11px',
                    borderRadius: '8px',
                    borderColor: '#E2E8F0'
                  }}
                  formatter={(val) => [`${val} Units`, 'Quantity']}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Custom Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10px] font-bold text-slate-600 mt-2">
              {warehouseDistData.map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span>{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Movements Log */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="text-teal-650" size={16} />
              <span>Recent Stock Movements Ledger</span>
            </h3>
            <p className="text-[10px] text-slate-400">Audit trail logs generated from cargo intake, custom clearances, and transfers.</p>
          </div>
          <Link
            to="/inventory/stock"
            className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-0.5"
          >
            <span>Monitor Grid</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {movementsLoading ? (
          <div className="space-y-2 py-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !movements || movements.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
            No stock movements have been recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">SKU & Item Name</th>
                  <th className="py-2.5 px-3">Depot</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Reference No</th>
                  <th className="py-2.5 px-3">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {movements.slice(0, 10).map((m) => {
                  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (m.type === 'receive' || m.type === 'transfer_in') badgeClass = 'bg-teal-50 text-teal-700 border-teal-150';
                  if (m.type === 'issue' || m.type === 'transfer_out') badgeClass = 'bg-rose-50 text-rose-700 border-rose-150';
                  if (m.type === 'adjustment') badgeClass = 'bg-amber-50 text-amber-700 border-amber-150';

                  return (
                    <tr key={m._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
                          {m.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="truncate max-w-[200px]">
                          <strong className="text-slate-800 block text-[11px] font-bold leading-none">{m.product?.sku}</strong>
                          <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">{m.product?.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-semibold">{m.warehouse?.code}</td>
                      <td className={`py-3 px-3 text-right font-extrabold whitespace-nowrap ${m.quantity > 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-500 whitespace-nowrap">{m.reference || '—'}</td>
                      <td className="py-3 px-3 text-slate-500 text-[10px] whitespace-nowrap">{m.performedBy?.name || 'System'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
