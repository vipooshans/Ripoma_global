import React from 'react';
import PaymentStatusBadge from './PaymentStatusBadge';

const InvoicePreviewPanel = ({ invoice }) => {
  if (!invoice) return null;

  const {
    invoiceNumber,
    type,
    status,
    issueDate,
    dueDate,
    paidDate,
    currency,
    subtotal = 0,
    taxTotal = 0,
    discountTotal = 0,
    shippingCharge = 0,
    grandTotal = 0,
    amountPaid = 0,
    amountDue = 0,
    items = [],
    customer = {},
    paymentInstructions,
    notes
  } = invoice;

  return (
    <div id="invoice-print-area" className="bg-white p-8 border border-slate-200 shadow-sm rounded-xl max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none">
      {/* Header Info */}
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">RIPOMA GLOBAL</h1>
          <p className="text-xs text-slate-500 mt-1">Import & Export Logistics Manager</p>
          <div className="text-xs text-slate-600 mt-3 space-y-1">
            <p>100 Logistics Way, Suite A</p>
            <p>Port Area, CA 94101</p>
            <p>billing@ripoma.com</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded bg-slate-800 text-white mb-3">
            {type === 'proforma' ? 'Proforma Invoice' : 'Commercial Invoice'}
          </span>
          <p className="text-lg font-bold text-slate-700">{invoiceNumber}</p>
          <div className="text-xs text-slate-600 mt-3 space-y-1">
            <p><span className="font-semibold text-slate-500">Date Issued:</span> {new Date(issueDate).toLocaleDateString()}</p>
            <p><span className="font-semibold text-slate-500">Due Date:</span> {new Date(dueDate).toLocaleDateString()}</p>
            {status === 'paid' && paidDate && (
              <p><span className="font-semibold text-slate-500">Paid Date:</span> {new Date(paidDate).toLocaleDateString()}</p>
            )}
            <div className="mt-2">
              <span className="text-slate-500 mr-2">Status:</span>
              <PaymentStatusBadge status={amountPaid >= grandTotal ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid'} />
            </div>
          </div>
        </div>
      </div>

      {/* Bill To & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-sm">
        <div>
          <h3 className="font-bold text-slate-700 uppercase tracking-wide text-xs mb-2">Billing Address</h3>
          <p className="font-semibold text-slate-800">{customer?.companyName || '—'}</p>
          <div className="text-slate-600 space-y-1 mt-1">
            <p>{customer?.address?.street || '—'}</p>
            <p>{customer?.address?.city || '—'}, {customer?.address?.state || '—'}</p>
            <p>{customer?.address?.postalCode || '—'}, {customer?.address?.country || '—'}</p>
            {customer?.taxId && <p className="text-xs mt-1"><span className="font-semibold">Tax ID:</span> {customer.taxId}</p>}
          </div>
        </div>
        <div>
          <h3 className="font-bold text-slate-700 uppercase tracking-wide text-xs mb-2">Shipping Details</h3>
          <p className="font-semibold text-slate-800">{customer?.companyName || '—'}</p>
          <div className="text-slate-600 space-y-1 mt-1">
            <p>{customer?.shippingAddress?.street || '—'}</p>
            <p>{customer?.shippingAddress?.city || '—'}, {customer?.shippingAddress?.state || '—'}</p>
            <p>{customer?.shippingAddress?.postalCode || '—'}, {customer?.shippingAddress?.country || '—'}</p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-4 py-3 text-right">Discount</th>
              <th className="px-4 py-3 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {items.map((item, idx) => (
              <tr key={item._id || idx}>
                <td className="px-4 py-3 font-medium text-slate-800">{item.description}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">Rs {item.unitPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{item.discount || 0}%</td>
                <td className="px-4 py-3 text-right font-medium">Rs {item.lineTotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Cost Block */}
      <div className="flex justify-end mb-8">
        <div className="w-80 space-y-2 text-sm text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-800">Rs {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <span className="font-semibold text-rose-600">-Rs {discountTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax:</span>
            <span className="font-semibold text-slate-800">Rs {taxTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping Charge:</span>
            <span className="font-semibold text-slate-800">Rs {shippingCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold text-slate-800">
            <span>Grand Total ({currency}):</span>
            <span className="text-indigo-700">Rs {grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-xs">
            <span>Amount Paid:</span>
            <span className="text-emerald-600 font-semibold">Rs {amountPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Amount Due:</span>
            <span className="text-rose-600 font-bold">Rs {amountDue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-500">
        <div>
          <h4 className="font-bold text-slate-700 mb-1">Notes & Terms</h4>
          <p className="leading-relaxed">{notes || 'No custom notes provided.'}</p>
        </div>
        <div>
          <h4 className="font-bold text-slate-700 mb-1">Payment Instructions</h4>
          <p className="leading-relaxed">{paymentInstructions || 'Please make payment directly via wire transfer to bank details.'}</p>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewPanel;
