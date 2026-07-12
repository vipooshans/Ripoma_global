import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, RefreshCw, Star, Check, X, Loader2, BadgeCheck } from 'lucide-react';
import storefrontReviewAdminService from '../../services/storefrontReviewAdmin.service';

const statusClass = (status) => {
  const map = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200'
  };
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
};

const StorefrontReviewList = () => {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storefrontReviewAdminService.listReviews({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: 15
      });
      setReviews(data.reviews || []);
      setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load reviews');
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

  const handleApprove = async (review) => {
    setBusyId(review.id);
    try {
      await storefrontReviewAdminService.approveReview(review.id);
      toast.success('Review approved');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (review) => {
    setBusyId(review.id);
    try {
      await storefrontReviewAdminService.rejectReview(review.id);
      toast.success('Review rejected');
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
            <Star size={22} className="text-amber-500" />
            Product Reviews
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Moderate customer ratings before they appear on the storefront
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
            placeholder="Search product, customer, comment…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-teal-500" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-16">No reviews found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-bold">Product</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Review</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => {
                  const busy = busyId === review.id;
                  return (
                    <tr key={review.id} className="border-b border-slate-50 align-top">
                      <td className="px-4 py-3 min-w-[160px]">
                        <p className="font-bold text-slate-800">{review.product?.name || '—'}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{review.product?.sku}</p>
                        <div className="flex items-center gap-1 mt-1 text-amber-500">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <p className="font-semibold text-slate-700">
                          {review.customer
                            ? `${review.customer.firstName} ${review.customer.lastName || ''}`.trim()
                            : '—'}
                        </p>
                        <p className="text-[11px] text-slate-400">{review.customer?.email}</p>
                        {review.verifiedPurchase && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-teal-700">
                            <BadgeCheck size={11} /> Verified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        {review.title && (
                          <p className="font-bold text-slate-800 text-xs mb-0.5">{review.title}</p>
                        )}
                        <p className="text-slate-600 text-xs leading-relaxed">{review.comment}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {review.createdAt ? new Date(review.createdAt).toLocaleString() : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusClass(review.status)}`}
                        >
                          {review.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-y-2 min-w-[120px]">
                        {review.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleApprove(review)}
                            className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-50 text-xs"
                          >
                            <Check size={12} /> Approve
                          </button>
                        )}
                        {review.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleReject(review)}
                            className="w-full inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-xs"
                          >
                            <X size={12} /> Reject
                          </button>
                        )}
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

export default StorefrontReviewList;
