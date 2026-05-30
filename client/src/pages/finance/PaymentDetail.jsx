import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Layers, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePaymentDetail, useUpdatePaymentStatus } from '../../hooks/usePayments';
import { PaymentTypeBadge, PaymentStatusBadge } from '../../components/finance/PaymentTypeBadge';
import CurrencyAmountDisplay from '../../components/finance/CurrencyAmountDisplay';
import { useAuth } from '../../hooks/useAuth';

const PaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const { data: p, isLoading, refetch } = usePaymentDetail(id);
  const updateStatusMutation = useUpdatePaymentStatus();

  const handleStatusChange = async (newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      toast.success(`Payment marked as ${newStatus}.`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payment status.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-teal-600" size={32} />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-sm font-bold">Payment record not found.</p>
        <button onClick={() => navigate('/finance/payments')} className="mt-4 btn-secondary py-1.5 px-4 font-bold text-xs">
          Go Back
        </button>
      </div>
    );
  }

  // Determine relative document link
  let linkedDocElement = <span className="text-slate-400 italic">No associated document</span>;
  if (p.invoice) {
    linkedDocElement = (
      <Link to={`/exports/invoices/${p.invoice._id}`} className="text-teal-650 font-bold hover:underline">
        Customer Invoice: {p.invoice.invoiceNumber}
      </Link>
    );
  } else if (p.exportOrder) {
    linkedDocElement = (
      <Link to={`/exports/orders/${p.exportOrder._id}`} className="text-teal-650 font-bold hover:underline">
        Sales Order (SO): {p.exportOrder.orderNumber}
      </Link>
    );
  } else if (p.importOrder) {
    linkedDocElement = (
      <Link to={`/imports/orders/${p.importOrder._id}`} className="text-teal-650 font-bold hover:underline">
        Purchase Order (PO): {p.importOrder.poNumber}
      </Link>
    );
  } else if (p.expense) {
    linkedDocElement = (
      <Link to={`/finance/expenses/${p.expense._id}`} className="text-teal-650 font-bold hover:underline">
        Expense Record: {p.expense.expenseNumber} — {p.expense.title}
      </Link>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-slate-800 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/finance/payments')}
            className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{p.paymentNumber}</h1>
              <PaymentTypeBadge type={p.type} />
              <PaymentStatusBadge status={p.status} />
            </div>
            <p className="text-slate-500 text-sm mt-0.5">Audit transaction details and counterparty links.</p>
          </div>
        </div>

        {/* Quick action buttons for pending payments */}
        {hasPermission('finance:write') && p.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('completed')}
              disabled={updateStatusMutation.isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5"
            >
              <CheckCircle size={14} />
              <span>Mark Cleared</span>
            </button>
            
            <button
              onClick={() => handleStatusChange('cancelled')}
              disabled={updateStatusMutation.isLoading}
              className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <XCircle size={14} />
              <span>Cancel Payment</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Transaction Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Card: Financial Value */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Financial Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Transaction Amount</span>
                <span className="text-lg font-mono font-extrabold text-slate-900">
                  {p.currency} {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Base Value (converted)</span>
                <span className="text-lg font-mono font-extrabold text-teal-650">
                  <CurrencyAmountDisplay 
                    amount={p.amountInBaseCurrency} 
                    originalAmount={p.amount} 
                    originalCurrency={p.currency} 
                    rate={p.exchangeRate}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Card: Methods & Routing */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Method & Bank Accounts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Payment Method</span>
                <span className="font-bold text-slate-700 capitalize">
                  {(p.paymentMethod || '').replace('_', ' ')}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Bank Reference</span>
                <span className="font-mono font-bold text-slate-650">
                  {p.referenceNumber || 'N/A'}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Company Account</span>
                <span className="font-bold text-slate-700">
                  {p.bankAccount || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Notes / Remarks</h3>
            <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 border border-slate-150 rounded-xl p-3.5 italic">
              {p.notes || 'No payment description recorded.'}
            </p>
          </div>
        </div>

        {/* Right Column: Counterparty & Audit trail */}
        <div className="space-y-6">
          {/* Card: Counterparty info */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Counterparty Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Party Name</span>
                <span className="font-extrabold text-slate-800 text-sm">{p.counterpartyName}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Party Category</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                  {p.counterpartyType}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Document Link */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Associated Document</h3>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-650 border border-teal-150">
                <FileText size={16} />
              </div>
              <div className="truncate">
                {linkedDocElement}
                <span className="block text-[9px] text-slate-400">Order/Invoice polymorphic link</span>
              </div>
            </div>
          </div>

          {/* Card: Audit & Dates */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-2">Audit Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Record Date</span>
                  <span className="font-semibold text-slate-700">
                    {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {p.dueDate && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Due Date</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(p.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase leading-none">Recorded By</span>
                  <span className="font-semibold text-slate-700">
                    {p.recordedBy?.name || 'System Auto-generated'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetail;
