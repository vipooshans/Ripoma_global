import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useExportDashboard } from '../../hooks/useExportOrders';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useExportDashboard();

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        Error loading export dashboard statistics: {error.message}
      </div>
    );
  }

  const kpis = data?.kpis || { totalOrders: 0, activeOrders: 0, totalRevenue: 0, monthlyGrowth: 0 };
  const revenueData = data?.revenueData || [];
  const pipelineData = data?.pipelineData || [];
  const recentOrders = data?.recentOrders || [];

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Export Operations Dashboard</h1>
          <p className="text-slate-500 text-sm">Monitor sales orders, international shipments, billing, and customer credits.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/exports/orders/create"
            className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            ➕ New Export Order
          </Link>
          <Link
            to="/exports/dispatch/board"
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            🚚 Dispatch Kanban
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl text-2xl">💰</div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Total Revenue</span>
            <span className="text-xl font-bold text-slate-800">${kpis.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl text-2xl">📦</div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Active Orders</span>
            <span className="text-xl font-bold text-slate-800">{kpis.activeOrders}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl text-2xl">📋</div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Total Orders Raised</span>
            <span className="text-xl font-bold text-slate-800">{kpis.totalOrders}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-2xl">📈</div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Monthly Growth</span>
            <span className="text-xl font-bold text-slate-800">+{kpis.monthlyGrowth}%</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Performance Area Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Monthly Revenue Comparison</h3>
            <span className="text-xs text-slate-400">Current vs Last Year</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="currentYearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  name="Current Year"
                  dataKey="currentYear"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#currentYearGrad)"
                />
                <Area
                  type="monotone"
                  name="Last Year"
                  dataKey="lastYear"
                  stroke="#64748B"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Stage Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Pipeline Stages</h3>
            <span className="text-xs text-slate-400">Sales Stages</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <Tooltip />
                <Bar dataKey="value" name="Orders Count" fill="#0F172A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders & Quick Links Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Export Orders */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Recent Sales Orders</h3>
            <Link to="/exports/orders" className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold">
              View All Orders →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Order No</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-slate-400">No orders raised yet.</td>
                  </tr>
                ) : (
                  recentOrders.map(order => (
                    <tr
                      key={order._id}
                      onClick={() => navigate(`/exports/orders/${order._id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-semibold text-slate-800">{order.orderNumber}</td>
                      <td className="py-3">{order.customer?.companyName || '—'}</td>
                      <td className="py-3">
                        <span className="capitalize font-semibold text-slate-600">
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-slate-800">
                        ${order.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Help Link List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm">Quick Links</h3>
          <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-700">
            <Link
              to="/exports/orders"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-100 flex items-center justify-between"
            >
              <span>📋 View Sales Orders Directory</span>
              <span className="text-slate-400">➔</span>
            </Link>
            <Link
              to="/exports/invoices"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-100 flex items-center justify-between"
            >
              <span>📄 Manage Commercial Invoices</span>
              <span className="text-slate-400">➔</span>
            </Link>
            <Link
              to="/exports/dispatch/board"
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-100 flex items-center justify-between"
            >
              <span>🚚 Dispatch Kanban & Shipments</span>
              <span className="text-slate-400">➔</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
