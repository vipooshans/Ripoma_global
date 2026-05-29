import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useExportOrders } from '../../hooks/useExportOrders';
import { useCustomers } from '../../hooks/useCustomers';
import ExportOrderStatusBadge from '../../components/exports/ExportOrderStatusBadge';
import PaymentStatusBadge from '../../components/exports/PaymentStatusBadge';

const OrderList = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customer, setCustomer] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('createdAt:desc');

  // Query database
  const { data: ordersData, isLoading, error } = useExportOrders({
    page,
    limit: 10,
    search,
    status,
    customer,
    priority,
    sort
  });

  const { data: customersData } = useCustomers();
  const customersList = customersData || [];

  const handleCsvExport = () => {
    const params = new URLSearchParams({
      search,
      status,
      customer,
      priority,
      sort
    });
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/export-orders/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (ordersData?.pagination?.totalPages || 1)) {
      setPage(newPage);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        Error loading export orders: {error.message}
      </div>
    );
  }

  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Sales Orders (Exports)</h1>
          <p className="text-slate-500 text-sm">Create, search, filter, and export sales orders raised with customers.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCsvExport}
            className="border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition"
          >
            📥 Export CSV
          </button>
          <Link
            to="/exports/orders/create"
            className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition"
          >
            ➕ New Export Order
          </Link>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        {/* Keyword Search */}
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Search
          </label>
          <input
            type="text"
            placeholder="Search order number or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Customer filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Customer
          </label>
          <select
            value={customer}
            onChange={(e) => { setCustomer(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Customers</option>
            {customersList.map(c => (
              <option key={c._id} value={c._id}>{c.companyName}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="ready_to_ship">Ready to Ship</option>
            <option value="dispatched">Dispatched</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        {/* Sorting option */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Sort By
          </label>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="createdAt:desc">Date Created (Newest)</option>
            <option value="createdAt:asc">Date Created (Oldest)</option>
            <option value="orderDate:desc">Order Date (Newest)</option>
            <option value="grandTotal:desc">Total Amount (Highest)</option>
            <option value="grandTotal:asc">Total Amount (Lowest)</option>
          </select>
        </div>
      </div>

      {/* Orders Table list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Order No</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-left">Order Date</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Payment</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                    <div className="animate-pulse">Loading orders...</div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                    No export orders found matching selected filters.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">{order.orderNumber}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800 block">{order.customer?.companyName || '—'}</span>
                      {order.customerReference && (
                        <span className="text-[11px] text-slate-400">Ref: {order.customerReference}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ExportOrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      ${order.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex justify-center gap-1.5 text-xs font-semibold">
                        <button
                          onClick={() => navigate(`/exports/orders/${order._id}`)}
                          className="border border-slate-300 hover:bg-slate-100 rounded px-2.5 py-1 text-slate-700"
                        >
                          👁️ View
                        </button>
                        {order.status === 'draft' && (
                          <button
                            onClick={() => navigate(`/exports/orders/${order._id}/edit`)}
                            className="bg-slate-800 hover:bg-slate-700 text-white rounded px-2.5 py-1"
                          >
                            ✏️ Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-xs border rounded bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-xs border rounded bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderList;
