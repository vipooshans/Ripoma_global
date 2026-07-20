import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useImportOrders } from '../../hooks/useImportOrders';
import { useWarehouses } from '../../hooks/useInventory';
import {
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Edit2,
  Calendar,
  X,
  FileText
} from 'lucide-react';
import POStatusBadge from '../../components/imports/POStatusBadge';
import PriorityBadge from '../../components/imports/PriorityBadge';
import api from '../../services/api';

const OrderList = () => {
  const navigate = useNavigate();

  // Filter states
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('createdAt:desc');

  // Queries
  const { data: orderData, isLoading, refetch } = useImportOrders({
    page,
    limit: 10,
    search,
    status: statusFilter,
    priority: priorityFilter,
    warehouse: warehouseFilter,
    dateFrom,
    dateTo,
    sort
  });

  const { data: warehouses } = useWarehouses();

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setWarehouseFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleExportCSV = () => {
    // Open export route in a new tab or trigger download
    window.open(`${api.defaults.baseURL || 'http://localhost:5000/api'}/import-orders/export`, '_blank');
  };

  const orders = orderData?.orders || [];
  const pagination = orderData?.pagination || { totalPages: 1, page: 1, total: 0 };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Purchase Orders</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Create and track import procurement orders raised with global suppliers.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <Link
            to="/imports/orders/create"
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10 font-bold"
          >
            <Plus size={14} />
            <span>Create PO</span>
          </Link>
        </div>
      </div>

      {/* Filters block */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search PO# or supplier..."
              className="form-input pl-9 text-xs"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Status select */}
          <select
            className="form-select text-xs"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Awaiting Approval</option>
            <option value="approved">Approved</option>
            <option value="ordered">Ordered</option>
            <option value="in_transit">In Transit</option>
            <option value="partially_received">Partially Received</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority select */}
          <select
            className="form-select text-xs"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Sort order */}
          <select
            className="form-select text-xs"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="createdAt:desc">Newest First</option>
            <option value="createdAt:asc">Oldest First</option>
            <option value="grandTotal:desc">Highest Cost</option>
            <option value="grandTotal:asc">Lowest Cost</option>
            <option value="expectedDeliveryDate:asc">Delivery Soonest</option>
          </select>
        </div>

        {/* Collapsible advanced filters (Warehouse and Date Range) */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Warehouse:</span>
            <select
              className="form-select text-xs py-1 px-2.5 max-w-[180px]"
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Warehouses</option>
              {warehouses?.map(w => (
                <option key={w._id} value={w._id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Date From:</span>
            <input
              type="date"
              className="form-input text-xs py-1 px-2.5 max-w-[130px]"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">To:</span>
            <input
              type="date"
              className="form-input text-xs py-1 px-2.5 max-w-[130px]"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {(search || statusFilter || priorityFilter || warehouseFilter || dateFrom || dateTo) && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-650 hover:text-rose-800 flex items-center gap-1 ml-auto"
            >
              <X size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <FileText size={40} className="mx-auto text-slate-300" />
            <p className="text-xs font-medium">No purchase orders found matching the filter criteria.</p>
            <Link to="/imports/orders/create" className="text-xs text-teal-650 font-bold hover:underline inline-block">
              Create your first PO now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">PO Number</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Priority</th>
                  <th className="py-3.5 px-4">Expected Delivery</th>
                  <th className="py-3.5 px-4">Created By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{o.poNumber}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{o.supplier?.companyName || '—'}</div>
                      <div className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">{o.supplier?.code || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-500">{o.items?.length || 0}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-950">
                      {o.grandTotal ? `Rs ${o.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">{o.currency}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <POStatusBadge status={o.status} />
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <PriorityBadge priority={o.priority} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {o.expectedDeliveryDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-450" />
                          <span>{new Date(o.expectedDeliveryDate).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{o.createdBy?.name || '—'}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/imports/orders/${o._id}`}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-all"
                          title="View PO Details"
                        >
                          <Eye size={15} />
                        </Link>
                        {['draft', 'pending_approval'].includes(o.status) && (
                          <Link
                            to={`/imports/orders/${o._id}/edit`}
                            className="p-1 text-teal-600 hover:text-teal-850 hover:bg-teal-50 rounded transition-all"
                            title="Edit PO"
                          >
                            <Edit2 size={15} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Panel */}
        {pagination.totalPages > 1 && (
          <div className="bg-slate-50/70 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing page <strong className="font-semibold">{pagination.page}</strong> of <strong className="font-semibold">{pagination.totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1 bg-white border border-slate-250 rounded hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50 transition-all shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 bg-white border border-slate-250 rounded hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50 transition-all shadow-sm"
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
