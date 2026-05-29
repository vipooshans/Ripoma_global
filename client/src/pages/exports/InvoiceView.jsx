import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInvoiceDetail, useSendInvoice, usePayInvoice } from '../../hooks/useInvoices';
import InvoicePreviewPanel from '../../components/exports/InvoicePreviewPanel';
import InvoiceActionsSidebar from '../../components/exports/InvoiceActionsSidebar';

const InvoiceView = () => {
  const { id } = useParams();

  const { data: invoice, isLoading, error, refetch } = useInvoiceDetail(id);
  const sendMutation = useSendInvoice();
  const payMutation = usePayInvoice();

  const handleSend = () => {
    sendMutation.mutate(id, {
      onSuccess: () => {
        alert('Invoice marked as sent.');
        refetch();
      }
    });
  };

  const handlePay = (payload, callback) => {
    payMutation.mutate(
      { id, ...payload },
      {
        onSuccess: (data) => {
          alert(data.message || 'Payment recorded successfully.');
          refetch();
          if (callback) callback();
        },
        onError: (err) => {
          alert(`Error recording payment: ${err.message}`);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        Error loading invoice details: {error?.message || 'Invoice not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link to="/exports/invoices" className="hover:text-slate-800 transition">Invoices</Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">{invoice.invoiceNumber}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Printable preview panel */}
        <div className="lg:col-span-3">
          <InvoicePreviewPanel invoice={invoice} />
        </div>

        {/* Control Actions sidebar */}
        <div>
          <InvoiceActionsSidebar
            invoice={invoice}
            onSend={handleSend}
            onPay={handlePay}
            isSending={sendMutation.isLoading}
            isPaying={payMutation.isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
