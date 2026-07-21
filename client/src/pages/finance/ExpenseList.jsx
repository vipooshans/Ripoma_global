import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Send, 
  Trash2, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';
import { 
  useExpenses, 
  useSubmitExpense, 
  useDeleteExpense 
} from '../../hooks/useExpenses';
import { ExpenseStatusBadge, ExpensePaymentStatusBadge } from '../../components/finance/ExpenseStatusBadge';
import CurrencyAmountDisplay from '../../components/finance/CurrencyAmountDisplay';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const ExpenseList = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Filters State
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [category, setCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Mutations
  const submitMutation = useSubmitExpense();
  const deleteMutation = useDeleteExpense();

  const queryParams = {
    page,
    limit: 10,
    status,
    paymentStatus,
    category,
    dateFrom,
    dateTo
  };

  const { data, isLoading, refetch } = useExpenses(queryParams);

  const format = (val) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmitting = async (id) => {
    try {
      await submitMutation.mutateAsync(id);
      toast.success('Expense submitted for approval.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit expense.');
    }
  };

  const handleDeleting = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft expense?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Draft expense deleted.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  const triggerCSVExport = () => {
    const query = new URLSearchParams({
      status,
      paymentStatus,
      category,
      dateFrom,
      dateTo
    }).toString();
    window.open(`http://localhost:5000/api/expenses/export?${query}`, '_blank');
  };

  const categories = [
    'freight', 'customs_duty', 'import_tax', 'export_tax', 'port_charges', 'handling',
    'insurance', 'inspection', 'certification', 'warehousing', 'packaging',
    'bank_charges', 'currency_conversion', 'agent_fees', 'legal', 'audit',
    'travel', 'utilities', 'salaries', 'office', 'marketing', 'other'
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Expenses Catalog</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Log and review corporate expenses, port costs, customs fees, and operational payouts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={triggerCSVExport}
            className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Download size={14} className="text-slate-450" />
            <span>Export CSV</span>
          </button>
          {hasPermission('finance:write') && (
            <Link
              to="/finance/expenses/add"
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10 font-bold"
            >
              <Plus size={14} />
              <span>Add Expense</span>
            </Link>
          )}
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Expenses This Month</span>
          <p className="text-xl font-extrabold text-slate-950 mt-1 tracking-tight">
            LKR {format(data?.summary?.totalThisMonth)}
          </p>
          <span className="text-[9px] text-slate-450 mt-1 block">Includes all approved/paid categories</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending Approval</span>
          <p className="text-xl font-extrabold text-indigo-650 mt-1 tracking-tight">
            LKR {format(data?.summary?.pendingApproval)}
          </p>
          <span className="text-[9px] text-indigo-500/80 font-bold mt-1 block">Awaiting manager check</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Awaiting Payment</span>
          <p className="text-xl font-extrabold text-orange-650 mt-1 tracking-tight">
            LKR {format(data?.summary?.awaitingPayment)}
          </p>
          <span className="text-[9px] text-orange-550 font-bold mt-1 block">Approved but unpaid expenses</span>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-slate-800 text-xs">
        {/* Status */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Approval Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid (Archive)</option>
          </select>
        </div>

        {/* Payment Status */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Payment Status</label>
          <select
            value={paymentStatus}
            onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Category</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 capitalize"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Ledger Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-5">EXP #</th>
                <th className="py-3 px-5">Title</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Linked To</th>
                <th className="py-3 px-5 text-right">Base Amount</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Submitted By</th>
                <th className="py-3 px-5">Approval</th>
                <th className="py-3 px-5">Payment</th>
                <th className="py-3 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {isLoading ? (
                [...Array(3)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan="10" className="py-4 px-5 h-12 bg-slate-50/50" />
                  </tr>
                ))
              ) : (!data?.expenses || data.expenses.length === 0) ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400 font-medium">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                data.expenses.map((e) => {
                  let linkedRef = 'None';
                  if (e.importOrder) {
                    linkedRef = `PO: ${e.importOrder.poNumber}`;
                  } else if (e.exportOrder) {
                    linkedRef = `SO: ${e.exportOrder.orderNumber}`;
                  } else if (e.shipment) {
                    linkedRef = `SH: ${e.shipment.shipmentNumber}`;
                  }

                  return (
                    <tr key={e._id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3.5 px-5 font-mono font-bold text-teal-650">{e.expenseNumber}</td>
                      <td className="py-3.5 px-5 font-bold text-slate-700 truncate max-w-[150px]" title={e.title}>
                        {e.title}
                        {e.vendor && <span className="block text-[9px] text-slate-400 font-normal">Vendor: {e.vendor}</span>}
                      </td>
                      <td className="py-3.5 px-5 font-bold capitalize text-slate-500 text-[10px]">
                        {e.category.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-500">{linkedRef}</td>
                      <td className="py-3.5 px-5 text-right font-extrabold">
                        <CurrencyAmountDisplay
                          amount={e.amountInBaseCurrency}
                          originalAmount={e.amount}
                          originalCurrency={e.currency}
                          rate={e.exchangeRate}
                        />
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 font-semibold">
                        {new Date(e.expenseDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-600">
                        {e.submittedBy?.name || 'System User'}
                      </td>
                      <td className="py-3.5 px-5">
                        <ExpenseStatusBadge status={e.status} />
                      </td>
                      <td className="py-3.5 px-5">
                        <ExpensePaymentStatusBadge paymentStatus={e.paymentStatus} />
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            to={`/finance/expenses/${e._id}`}
                            className="p-1 text-slate-400 hover:text-teal-650 rounded hover:bg-slate-100 transition-colors"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </Link>

                          {hasPermission('finance:write') && e.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleSubmitting(e._id)}
                                className="p-1 text-slate-400 hover:text-teal-655 rounded hover:bg-slate-100 transition-colors"
                                title="Submit for Approval"
                              >
                                <Send size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleting(e._id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                                title="Delete Draft"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} records)
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="btn-secondary py-1 px-3 text-[10px] disabled:opacity-50 disabled:pointer-events-none font-bold"
              >
                Previous
              </button>
              <button
                disabled={page === data.pagination.totalPages}
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                className="btn-secondary py-1 px-3 text-[10px] disabled:opacity-50 disabled:pointer-events-none font-bold"
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

export default ExpenseList;
