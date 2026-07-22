import React, { useState } from 'react';
import { apiUrl } from '../../config/apiBase';

const InvoiceActionsSidebar = ({ invoice, onSend, onPay, isSending, isPaying }) => {
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.open(apiUrl(`/invoices/${invoice._id}/pdf`), '_blank');
  };

  const handleSubmitPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return alert('Please enter a valid positive payment amount.');
    
    onPay({ amountPaid: amount, note: paymentNote }, () => {
      setShowPayModal(false);
      setPaymentAmount('');
      setPaymentNote('');
    });
  };

  const isFullyPaid = invoice.status === 'paid';

  return (
    <div className="space-y-4">
      {/* Action Buttons Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-semibold text-slate-800 text-sm mb-4">Invoice Actions</h3>
        
        {invoice.status === 'draft' && (
          <button
            onClick={onSend}
            disabled={isSending}
            className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isSending ? 'Sending...' : '📨 Mark as Sent'}
          </button>
        )}

        {!isFullyPaid && (
          <button
            onClick={() => setShowPayModal(true)}
            className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-emerald-700 transition"
          >
            💰 Record Payment
          </button>
        )}

        <button
          onClick={handleDownloadPdf}
          className="w-full border border-slate-300 text-slate-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-50 transition"
        >
          📥 Download PDF Document
        </button>

        <button
          onClick={handlePrint}
          className="w-full border border-slate-300 text-slate-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-50 transition"
        >
          🖨️ Print Invoice
        </button>
      </div>

      {/* Record Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Record Invoice Payment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the payment received from the customer. This will update the invoice status, order payment tallies, and decrease customer outstanding balance.
            </p>
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Payment Amount
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={invoice.grandTotal - invoice.amountPaid}
                    required
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Max remaining: ${(invoice.grandTotal - invoice.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Notes
                </label>
                <textarea
                  placeholder="e.g. Wire transfer ref #12345"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t text-sm">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="border border-slate-300 rounded-lg px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="bg-emerald-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {isPaying ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceActionsSidebar;
