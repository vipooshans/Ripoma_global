import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoices } from '../../hooks/useInvoices';
import { useCustomers } from '../../hooks/useCustomers';
import PaymentStatusBadge from '../../components/exports/PaymentStatusBadge';

const InvoiceList = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [customer, setCustomer] = useState('');

  const { data: invoicesData, isLoading, error } = useInvoices({
    page,
    limit: 10,
    search,
    status,
    type,
    customer
  });

  const { data: customersData } = useCustomers();
  const customers = customersData?.customers || [];

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (invoicesData?.pagination?.totalPages || 1)) {
      setPage(newPage);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        Error loading invoices: {error.message}
      </div>
    );
  }

  const invoices = invoicesData?.invoices || [];
  const pagination = invoicesData?.pagination || { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Export Commercial & Proforma Invoices</h1>
        <p className="text-slate-500 text-sm">Monitor billing summaries, record customer wire payments, and track overdue accounts.</p>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Search
          </label>
          <input
            type="text"
            placeholder="Search invoice number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

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
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.companyName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Billing Type
          </label>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="proforma">Proforma</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>

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
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Invoice No</th>
                <th className="px-6 py-4 text-left">Type</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-left">Due Date</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-right">Amount Due</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">
                    <div className="animate-pulse">Loading invoices...</div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isOverdue = inv.status === 'overdue';
                  return (
                    <tr
                      key={inv._id}
                      className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-rose-50/20' : ''}`}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {inv.invoiceNumber}
                        {isOverdue && (
                          <span className="ml-2 inline-flex items-center text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-1.5 py-0.5 rounded">
                            ⚠️ Overdue
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 capitalize font-medium text-xs">{inv.type}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{inv.customer?.companyName || '—'}</td>
                      <td className="px-6 py-4">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap capitalize text-xs">
                        <PaymentStatusBadge status={inv.amountPaid >= inv.grandTotal ? 'paid' : inv.amountPaid > 0 ? 'partial' : 'unpaid'} />
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600">
                        ${inv.amountDue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ${inv.grandTotal.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/exports/invoices/${inv._id}`)}
                          className="border border-slate-300 hover:bg-slate-100 rounded px-2.5 py-1 text-xs font-semibold text-slate-700"
                        >
                          👁️ View & Pay
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

export default InvoiceList;
