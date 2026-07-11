import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Search, RefreshCw, ShoppingBag, Check, X, Loader2
} from 'lucide-react';
import storefrontOrderAdminService from '../../services/storefrontOrderAdmin.service';
import { formatPrice } from '../../utils/formatPrice';

const STATUS_OPTIONS = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'delivered'
];

const statusClass = (status) => {
  const map = {
    placed: 'bg-teal-50 text-teal-700',
    confirmed: 'bg-sky-50 text-sky-700',
    processing: 'bg-amber-50 text-amber-700',
    shipped: 'bg-indigo-50 text-indigo-700',
    delivered: 'bg-emerald-50 text-emerald-700',
    cancellation_requested: 'bg-orange-50 text-orange-700',
    cancelled: 'bg-rose-50 text-rose-700'
  };
  return map[status] || 'bg-slate-50 text-slate-600';
};

const StorefrontOrderList = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storefrontOrderAdminService.listOrders({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: 15
      });
      setOrders(data.orders || []);
      setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
      const nextDrafts = {};
      (data.orders || []).forEach((o) => {
        nextDrafts[o.id] = {
          orderStatus: ['cancellation_requested', 'cancelled'].includes(o.orderStatus)
            ? 'confirmed'
            : o.orderStatus,
          trackingNumber: o.trackingNumber || '',
          carrier: o.carrier || ''
        };
      });
      setDrafts(nextDrafts);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load storefront orders');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const updateDraft = (id, patch) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const handleSaveStatus = async (order) => {
    const draft = drafts[order.id];
    if (!draft) return;
    setBusyId(order.id);
    try {
      await storefrontOrderAdminService.updateStatus(order.id, {
        orderStatus: draft.orderStatus,
        trackingNumber: draft.trackingNumber,
        carrier: draft.carrier
      });
      toast.success('Order updated');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveCancel = async (order) => {
    setBusyId(order.id);
    try {
      await storefrontOrderAdminService.approveCancel(order.id);
      toast.success('Cancellation approved');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectCancel = async (order) => {
    setBusyId(order.id);
    try {
      await storefrontOrderAdminService.rejectCancel(order.id);
      toast.success('Cancellation rejected');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <ShoppingBag size={22} className="text-teal-600" />
            Storefront Orders
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage customer web orders, tracking, and cancellation requests
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or customer…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white"
        >
          <option value="">All statuses</option>
          {[...STATUS_OPTIONS, 'cancellation_requested', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="animate-spin text-teal-600" size={28} />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No storefront orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status / Tracking</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const draft = drafts[order.id] || {};
                  const busy = busyId === order.id;
                  return (
                    <tr key={order.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-extrabold text-slate-800">{order.orderNumber}</p>
                        <p className="text-slate-400 mt-0.5">
                          {order.placedAt ? new Date(order.placedAt).toLocaleString() : '—'}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full font-bold capitalize ${statusClass(order.orderStatus)}`}>
                          {order.orderStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-semibold">
                          {order.contact?.firstName} {order.contact?.lastName}
                        </p>
                        <p className="text-slate-400">{order.contact?.email}</p>
                        <p className="text-slate-400 capitalize mt-1">
                          Pay: {order.paymentStatus?.replace(/_/g, ' ')}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-800">
                        {formatPrice(order.grandTotal, order.currency)}
                      </td>
                      <td className="px-4 py-3 space-y-2 min-w-[200px]">
                        {order.orderStatus === 'cancellation_requested' ? (
                          <p className="text-orange-700 font-semibold">
                            Cancel reason: {order.cancelReason || '—'}
                          </p>
                        ) : order.orderStatus === 'cancelled' ? (
                          <p className="text-rose-600 font-semibold">Cancelled</p>
                        ) : (
                          <>
                            <select
                              value={draft.orderStatus || order.orderStatus}
                              onChange={(e) => updateDraft(order.id, { orderStatus: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <input
                              value={draft.carrier || ''}
                              onChange={(e) => updateDraft(order.id, { carrier: e.target.value })}
                              placeholder="Carrier"
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5"
                            />
                            <input
                              value={draft.trackingNumber || ''}
                              onChange={(e) => updateDraft(order.id, { trackingNumber: e.target.value })}
                              placeholder="Tracking #"
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5"
                            />
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 space-y-2 min-w-[140px]">
                        {order.orderStatus === 'cancellation_requested' ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleApproveCancel(order)}
                              className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50"
                            >
                              <Check size={12} /> Approve cancel
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRejectCancel(order)}
                              className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <X size={12} /> Reject
                            </button>
                          </>
                        ) : order.orderStatus !== 'cancelled' ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleSaveStatus(order)}
                            className="w-full px-2 py-1.5 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-50"
                          >
                            {busy ? 'Saving…' : 'Save'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-xs">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="font-semibold text-slate-600">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default StorefrontOrderList;
