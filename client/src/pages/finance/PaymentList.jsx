import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';
import { usePayments, useUpdatePaymentStatus } from '../../hooks/usePayments';
import { PaymentTypeBadge, PaymentStatusBadge } from '../../components/finance/PaymentTypeBadge';
import OverduePill from '../../components/finance/OverduePill';
import CurrencyAmountDisplay from '../../components/finance/CurrencyAmountDisplay';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const PaymentList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();

  // Filters state
  const [activeTab, setActiveTab] = useState('all'); // all | inbound | outbound
  const [status, setStatus] = useState('');
  const [counterpartyType, setCounterpartyType] = useState('');
  const [currency, setCurrency] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdueOnly') === 'true');
  const [page, setPage] = useState(1);

  // Status transition mutation
  const updateStatusMutation = useUpdatePaymentStatus();

  // Build query params
  const queryParams = {
    page,
    limit: 10,
    status,
    counterpartyType,
    currency,
    dateFrom,
    dateTo,
    overdueOnly: overdueOnly ? 'true' : 'false'
  };

  if (activeTab !== 'all') {
    queryParams.type = activeTab;
  }

  // Fetch payments list
  const { data, isLoading, refetch } = usePayments(queryParams);

  const format = (val) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      toast.success(`Payment status updated to ${newStatus}.`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payment status.');
    }
  };

  const triggerCSVExport = () => {
    const query = new URLSearchParams({
      type: activeTab !== 'all' ? activeTab : '',
      status,
      dateFrom,
      dateTo
    }).toString();
    
    // Set windows location to trigger backend CSV download stream
    window.open(`http://localhost:5000/api/payments/export?${query}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Payments Ledger</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor and record all import payables and export customer receivables.
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
              to="/finance/payments/add"
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10 font-bold"
            >
              <Plus size={14} />
              <span>Record Payment</span>
            </Link>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-sm">
        <div className="border-r border-slate-800/60 md:pr-4">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Total Inbound (Receivable)</p>
          <p className="text-lg font-mono font-extrabold text-emerald-450 mt-1">
            Rs {format(data?.summary?.totalInbound)}
          </p>
        </div>
        <div className="border-r border-slate-800/60 md:px-4">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Total Outbound (Payable)</p>
          <p className="text-lg font-mono font-extrabold text-rose-450 mt-1">
            Rs {format(data?.summary?.totalOutbound)}
          </p>
        </div>
        <div className="md:pl-4">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Net Position</p>
          <p className={`text-lg font-mono font-extrabold mt-1 ${
            (data?.summary?.net >= 0) ? 'text-teal-400' : 'text-rose-500'
          }`}>
            Rs {format(data?.summary?.net)}
          </p>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
        {/* Toggle tabs */}
        <div className="flex border-b border-slate-200">
          {['all', 'inbound', 'outbound'].map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`pb-2.5 px-4 text-xs font-bold capitalize transition-all border-b-2 -mb-[2px] ${
                activeTab === tab 
                  ? 'border-teal-650 text-teal-650' 
                  : 'border-transparent text-slate-400 hover:text-slate-650'
              }`}
            >
              {tab === 'all' ? 'All Payments' : tab === 'inbound' ? 'Receivables (Inbound)' : 'Payables (Outbound)'}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Status */}
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Counterparty Type */}
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Counterparty</label>
            <select
              value={counterpartyType}
              onChange={(e) => { setCounterpartyType(e.target.value); setPage(1); }}
              className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Parties</option>
              <option value="customer">Customers</option>
              <option value="supplier">Suppliers</option>
              <option value="bank">Banks</option>
              <option value="government">Government</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Date range from */}
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Date range to */}
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Overdue toggle */}
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="overdueOnly"
              checked={overdueOnly}
              onChange={(e) => { setOverdueOnly(e.target.checked); setPage(1); }}
              className="rounded text-teal-650 focus:ring-teal-500 h-4 w-4 border-slate-250 cursor-pointer"
            />
            <label htmlFor="overdueOnly" className="text-xs font-bold text-slate-650 cursor-pointer selection:bg-transparent">
              Overdue Only
            </label>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-slate-800 text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-5">PAY #</th>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5">Counterparty</th>
                <th className="py-3 px-5">Linked To</th>
                <th className="py-3 px-5 text-right">Base Amount</th>
                <th className="py-3 px-5 text-center">Method</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Due Date</th>
                <th className="py-3 px-5">Status</th>
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
              ) : (!data?.payments || data.payments.length === 0) ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400 font-medium">
                    No payment records found matching the filters.
                  </td>
                </tr>
              ) : (
                data.payments.map((p) => {
                  // Figure out link details
                  let linkedRef = 'None';
                  if (p.invoice) {
                    linkedRef = `Invoice: ${p.invoice.invoiceNumber}`;
                  } else if (p.exportOrder) {
                    linkedRef = `SO: ${p.exportOrder.orderNumber}`;
                  } else if (p.importOrder) {
                    linkedRef = `PO: ${p.importOrder.poNumber}`;
                  } else if (p.expense) {
                    linkedRef = `EXP: ${p.expense.expenseNumber}`;
                  }

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3.5 px-5 font-mono font-bold text-teal-650">{p.paymentNumber}</td>
                      <td className="py-3.5 px-5">
                        <PaymentTypeBadge type={p.type} />
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-700">
                        {p.counterpartyName}
                        <span className="block text-[9px] text-slate-400 capitalize font-normal">
                          {p.counterpartyType}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-500">{linkedRef}</td>
                      <td className="py-3.5 px-5 text-right font-extrabold">
                        <CurrencyAmountDisplay 
                          amount={p.amountInBaseCurrency} 
                          originalAmount={p.amount} 
                          originalCurrency={p.currency}
                          rate={p.exchangeRate}
                        />
                      </td>
                      <td className="py-3.5 px-5 text-center font-bold text-slate-500 uppercase tracking-tight text-[10px]">
                        {(p.paymentMethod || '').replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 font-semibold">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-5 font-semibold">
                        <div className="flex flex-col gap-1 items-start">
                          <span>{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : 'N/A'}</span>
                          {p.status === 'pending' && <OverduePill dueDate={p.dueDate} isOverdue={p.isOverdue} />}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            to={`/finance/payments/${p._id}`}
                            className="p-1 text-slate-400 hover:text-teal-600 rounded hover:bg-slate-100 transition-colors"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </Link>

                          {hasPermission('finance:write') && p.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(p._id, 'completed')}
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-slate-100 transition-colors"
                                title="Mark Completed"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(p._id, 'cancelled')}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                                title="Cancel Payment"
                              >
                                <XCircle size={14} />
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

        {/* Pagination footer */}
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

export default PaymentList;
