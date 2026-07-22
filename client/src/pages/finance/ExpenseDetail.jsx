import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  FileText, 
  Send, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  ExternalLink 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SOCKET_BASE_URL } from '../../config/apiBase';
import { 
  useExpenseDetail, 
  useSubmitExpense, 
  useDeleteExpense, 
  useApproveExpense, 
  useRejectExpense,
  useMarkExpensePaid
} from '../../hooks/useExpenses';
import { ExpenseStatusBadge, ExpensePaymentStatusBadge } from '../../components/finance/ExpenseStatusBadge';
import CurrencyAmountDisplay from '../../components/finance/CurrencyAmountDisplay';
import { useAuth } from '../../hooks/useAuth';

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  
  // Checking roles for manager approvals
  const isManagerOrAdmin = ['admin', 'manager'].includes(user?.role);

  // Queries & Mutations
  const { data: e, isLoading, refetch } = useExpenseDetail(id);
  const submitMutation = useSubmitExpense();
  const deleteMutation = useDeleteExpense();
  const approveMutation = useApproveExpense();
  const rejectMutation = useRejectExpense();
  const payMutation = useMarkExpensePaid();

  // Rejection dialog state
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const handleSubmitting = async () => {
    try {
      await submitMutation.mutateAsync(id);
      toast.success('Expense successfully submitted for review.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit expense.');
    }
  };

  const handleDeleting = async () => {
    if (!window.confirm('Are you sure you want to delete this draft expense?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Draft expense deleted.');
      navigate('/finance/expenses');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success('Expense approved successfully.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve expense.');
    }
  };

  const handleRejectSubmit = async (event) => {
    event.preventDefault();
    if (!rejectReason.trim()) {
      return toast.error('Please enter a rejection reason.');
    }

    try {
      await rejectMutation.mutateAsync({ id, rejectionReason: rejectReason });
      toast.success('Expense rejected with feedback.');
      setShowRejectForm(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject expense.');
    }
  };

  const handlePay = async () => {
    try {
      await payMutation.mutateAsync(id);
      toast.success('Expense marked as paid.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark expense paid.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-teal-600" size={32} />
      </div>
    );
  }

  if (!e) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-sm font-bold">Expense record not found.</p>
        <button onClick={() => navigate('/finance/expenses')} className="mt-4 btn-secondary py-1.5 px-4 font-bold text-xs">
          Go Back
        </button>
      </div>
    );
  }

  let linkedRefText = <span className="text-slate-400 italic">No operational link</span>;
  if (e.importOrder) {
    linkedRefText = (
      <Link to={`/imports/orders/${e.importOrder._id || e.importOrder}`} className="text-teal-650 font-bold hover:underline flex items-center gap-1">
        <span>PO: {e.importOrder.poNumber || 'Details'}</span>
        <ExternalLink size={10} />
      </Link>
    );
  } else if (e.exportOrder) {
    linkedRefText = (
      <Link to={`/exports/orders/${e.exportOrder._id || e.exportOrder}`} className="text-teal-650 font-bold hover:underline flex items-center gap-1">
        <span>SO: {e.exportOrder.orderNumber || 'Details'}</span>
        <ExternalLink size={10} />
      </Link>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-slate-800 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/finance/expenses')}
            className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{e.expenseNumber}</h1>
              <ExpenseStatusBadge status={e.status} />
              <ExpensePaymentStatusBadge paymentStatus={e.paymentStatus} />
            </div>
            <p className="text-slate-500 text-sm mt-0.5">{e.title}</p>
          </div>
        </div>

        {/* Action Controls based on status */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {/* Draft Actions */}
          {hasPermission('finance:write') && e.status === 'draft' && (
            <>
              <button
                onClick={handleSubmitting}
                className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10 font-bold"
              >
                <Send size={14} />
                <span>Submit for Approval</span>
              </button>
              <Link
                to={`/finance/expenses/${e._id}/edit`}
                className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3.5 font-bold"
              >
                <Edit3 size={14} />
                <span>Edit Draft</span>
              </Link>
              <button
                onClick={handleDeleting}
                className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </>
          )}

          {/* Manager Approvals (on submitted status) */}
          {isManagerOrAdmin && e.status === 'submitted' && (
            <>
              <button
                onClick={handleApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                <span>Approve Expense</span>
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5"
              >
                <XCircle size={14} />
                <span>Reject Expense</span>
              </button>
            </>
          )}

          {/* Mark Paid (on approved status) */}
          {hasPermission('finance:write') && e.status === 'approved' && (
            <button
              onClick={handlePay}
              className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5"
            >
              <CheckCircle size={14} />
              <span>Mark as Paid</span>
            </button>
          )}
        </div>
      </div>

      {/* Rejection Dialog Form */}
      {showRejectForm && (
        <form onSubmit={handleRejectSubmit} className="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-2 text-rose-800">
            <AlertTriangle className="shrink-0 mt-0.5" size={16} />
            <div>
              <h4 className="font-extrabold text-xs">Enter Rejection Feedback</h4>
              <p className="text-[10px] text-rose-700 mt-0.5">Please provide a reason to help the submitter correct the draft.</p>
            </div>
          </div>
          <textarea
            rows="2"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Receipt is blurry. Please re-upload a clear S3 scan."
            className="w-full text-xs font-bold text-slate-700 bg-white border border-rose-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-655 text-[10px] font-bold py-1.5 px-3 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-1.5 px-4 rounded-lg shadow"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-2 space-y-6">
          {/* Values */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Financial Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-450 font-extrabold uppercase block">Original Amount</span>
                <span className="text-lg font-mono font-extrabold text-slate-900">
                  {e.currency} {e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-450 font-extrabold uppercase block">Base Value (converted)</span>
                <span className="text-lg font-mono font-extrabold text-teal-650">
                  <CurrencyAmountDisplay 
                    amount={e.amountInBaseCurrency} 
                    originalAmount={e.amount} 
                    originalCurrency={e.currency} 
                    rate={e.exchangeRate}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Vendors & References */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Vendor & Reference Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] text-slate-450 font-extrabold uppercase block">Vendor Name</span>
                <span className="font-extrabold text-slate-800 text-sm">{e.vendor || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-450 font-extrabold uppercase block">Invoice Reference</span>
                <span className="font-mono font-bold text-slate-700">{e.invoiceReference || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Purpose / Remarks</h3>
            <p className="text-slate-650 font-medium leading-relaxed bg-slate-50 border border-slate-150 rounded-xl p-3.5 italic">
              {e.notes || 'No description recorded.'}
            </p>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Rejection Alert */}
          {e.status === 'rejected' && e.rejectionReason && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-950 space-y-1">
              <h4 className="font-extrabold text-xs flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-600" />
                <span>Rejection Feedback</span>
              </h4>
              <p className="text-[10px] text-rose-700 italic">"{e.rejectionReason}"</p>
            </div>
          )}

          {/* S3 Attachment receipt preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 text-center">
            <h3 className="font-extrabold text-slate-800 text-sm text-left border-b border-slate-100 pb-2">Receipt Document</h3>
            {e.receiptUrl ? (
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                <FileText className="text-slate-400 mx-auto" size={32} />
                <div className="truncate">
                  <span className="block text-[10px] font-bold text-slate-700 truncate">{e.receiptUrl.split('/').pop()}</span>
                  <span className="block text-[9px] text-slate-400">Attached receipt</span>
                </div>
                <a
                  href={`${SOCKET_BASE_URL}${e.receiptUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-650 hover:underline mx-auto"
                >
                  <span>Open attachment</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            ) : (
              <div className="py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 font-medium italic">
                No receipt uploaded.
              </div>
            )}
          </div>

          {/* Operational links */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Linked Operations</h3>
            <div className="space-y-3">
              <div>
                <span className="text-[9px] text-slate-450 font-extrabold uppercase block font-bold">Category</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-650 border border-slate-200 capitalize">
                  {e.category.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-450 font-extrabold uppercase block font-bold">Operational Context</span>
                {linkedRefText}
              </div>
            </div>
          </div>

          {/* Audit dates */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Audit Trail</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Expense Date</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(e.expenseDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Submitted By</span>
                  <span className="font-semibold text-slate-700">
                    {e.submittedBy?.name || 'System User'}
                  </span>
                </div>
              </div>

              {e.approvedBy && (
                <div className="flex items-center gap-2">
                  <User size={14} className="text-slate-400" />
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">
                      {e.status === 'rejected' ? 'Rejected By' : 'Approved By'}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {e.approvedBy?.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetail;
