import React from 'react';

const PaymentHistoryList = ({ order, invoices = [] }) => {
  // Aggregate payments from invoices or show order timeline payments
  // In our system, payments are recorded on invoices and order amounts are updated.
  // We can fetch payments from the invoice objects or directly list them.
  const paidInvoices = invoices.filter(inv => inv.amountPaid > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="font-semibold text-sm text-slate-800">Recorded Payment History</h3>
      </div>
      {paidInvoices.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-sm">
          No payments recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {paidInvoices.map((inv) => (
            <div key={inv._id} className="p-4 flex items-center justify-between text-sm hover:bg-slate-50 transition-colors">
              <div>
                <span className="font-semibold text-slate-700 block">
                  Invoice {inv.invoiceNumber}
                </span>
                <span className="text-slate-400 text-xs block">
                  Paid Date: {inv.paidDate ? new Date(inv.paidDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-600 block">
                  +${inv.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-500">
                  {inv.status === 'paid' ? 'Fully Paid' : 'Partially Paid'}
                </span>
              </div>
            </div>
          ))}
          <div className="p-4 bg-slate-50 flex justify-between font-bold text-slate-800">
            <span>Total Amount Paid:</span>
            <span className="text-emerald-700">
              ${order?.amountPaid?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentHistoryList;
