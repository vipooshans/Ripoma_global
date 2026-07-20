import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  useImportDashboard,
  usePendingApprovals
} from '../../hooks/useImportOrders';
import {
  FileText,
  CheckSquare,
  Truck,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  AlertCircle,
  Eye,
  Activity,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import POStatusBadge from '../../components/imports/POStatusBadge';

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: dash, isLoading } = useImportDashboard();
  const { data: pending } = usePendingApprovals();

  const handleCreateClick = () => {
    navigate('/imports/orders/create');
  };

  const kpis = [
    {
      title: 'Total POs This Month',
      value: dash?.kpis?.totalOrdersMonth || 0,
      desc: 'New purchase orders created',
      icon: FileText,
      color: 'text-teal-600 bg-teal-50 border-teal-100'
    },
    {
      title: 'Awaiting Approval',
      value: dash?.kpis?.pendingApprovalCount || 0,
      desc: 'Requires review actions',
      icon: CheckSquare,
      color: 'text-amber-600 bg-amber-50 border-amber-100'
    },
    {
      title: 'Active In-Transit',
      value: dash?.kpis?.inTransitCount || 0,
      desc: 'Shipments currently cargo en-route',
      icon: Truck,
      color: 'text-purple-600 bg-purple-50 border-purple-100'
    },
    {
      title: 'Spend This Month',
      value: `Rs ${(dash?.kpis?.totalMonthValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      desc: 'Excludes draft & cancelled orders',
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
    }
  ];

  // Pipeline funnel data formatting (horizontal bar chart mapping)
  const funnelData = dash?.funnel?.map(item => ({
    status: item.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    count: item.count
  })) || [];

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Imports Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage international procurement cycles, approval gates, tracking, and warehouse intake.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleCreateClick}
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10 font-bold"
          >
            <Plus size={14} />
            <span>Create Purchase Order</span>
          </button>
          <Link
            to="/imports/approvals"
            className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3.5 font-bold"
          >
            <CheckSquare size={14} />
            <span>Approvals Queue</span>
          </Link>
        </div>
      </div>

      {/* Pending Approvals Warning Notification banner */}
      {pending?.orders && pending.orders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-start gap-3 shadow-sm animate-pulse">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-extrabold text-xs">Action Required: Pending Approvals</h4>
            <p className="text-[11px] text-amber-700 mt-0.5">
              You have <strong className="font-bold">{pending.orders.length} import orders</strong> awaiting your authorization.
            </p>
          </div>
          <Link
            to="/imports/approvals"
            className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-0.5 shrink-0 hover:underline"
          >
            <span>Review Queue</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

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
              {isLoading ? (
                <div className="h-7 w-20 bg-slate-100 animate-pulse rounded mt-1.5" />
              ) : (
                <p className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Import Spend (Line Chart) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Monthly Import Procurement Spend</h3>
            <p className="text-[10px] text-slate-450">Historical trailing monthly purchasing volume (approved / ordered / completed).</p>
          </div>
          <div className="h-[280px] w-full text-xs font-semibold">
            {isLoading ? (
              <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dash?.monthlySpend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', borderColor: '#E2E8F0' }}
                    formatter={(val) => [`Rs ${val.toLocaleString()}`, 'Total Spend']}
                  />
                  <Line type="monotone" dataKey="spend" stroke="#0D9488" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pipeline Funnel Status Chart (Horizontal Bar Chart) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 lg:col-span-1 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Logistics Funnel Distribution</h3>
            <p className="text-[10px] text-slate-450">Active orders volume count breakdown by phase.</p>
          </div>
          <div className="h-[280px] w-full text-xs font-semibold">
            {isLoading ? (
              <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnelData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis dataKey="status" type="category" stroke="#94A3B8" fontSize={8} width={90} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', borderColor: '#E2E8F0' }} />
                  <Bar dataKey="count" fill="#0F172A" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Log & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Log */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="text-teal-600" size={16} />
              <span>Procurement Activity Log</span>
            </h3>
            <Link
              to="/imports/orders"
              className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-0.5 hover:underline"
            >
              <span>View All POs</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !dash?.activities || dash.activities.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium">
              No recent import activity logged.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
              {dash.activities.map((act, i) => (
                <div key={i} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div className="flex gap-3">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 mt-0.5">
                      <Activity size={14} />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800">
                        {act.poNumber} — {act.supplierName || 'Unknown Supplier'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Amount: <strong className="font-semibold text-slate-700">${act.grandTotal?.toLocaleString()}</strong>
                      </p>
                      <span className="text-[9px] text-slate-400 block mt-1">
                        {new Date(act.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <POStatusBadge status={act.status} />
                    <Link
                      to={`/imports/orders/${act.id}`}
                      className="text-[10px] text-teal-650 hover:text-teal-850 font-bold hover:underline flex items-center gap-0.5 mt-1"
                    >
                      <span>View Details</span>
                      <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links / Actions */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 lg:col-span-1 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm">Quick Actions</h3>
          <div className="flex flex-col gap-2.5">
            <Link
              to="/imports/orders/create"
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-all group font-bold text-xs text-slate-850"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-650 border border-teal-100 group-hover:scale-105 transition-all">
                  <Plus size={16} />
                </div>
                <span>Create Purchase Order</span>
              </div>
              <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-all" />
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
