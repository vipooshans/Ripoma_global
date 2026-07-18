import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatePayment } from '../../hooks/usePayments';
import { useBaseCurrency, useCurrencyRates } from '../../hooks/useCurrencyRates';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useCustomers } from '../../hooks/useCustomers';
import { useImportOrders } from '../../hooks/useImportOrders';
import { useExportOrders } from '../../hooks/useExportOrders';
import { useInvoices } from '../../hooks/useInvoices';
import { useExpenses } from '../../hooks/useExpenses';

const PaymentForm = () => {
  const navigate = useNavigate();
  const createPaymentMutation = useCreatePayment();

  const { data: baseData } = useBaseCurrency();
  const baseCurrency = baseData?.baseCurrency || 'USD';
  const { data: rateDoc } = useCurrencyRates();
  const rates = rateDoc?.rates || {};

  // Form states
  const [type, setType] = useState('inbound'); // inbound | outbound
  const [counterpartyType, setCounterpartyType] = useState('customer'); // supplier | customer | bank | government | other
  const [counterpartyId, setCounterpartyId] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [linkType, setLinkType] = useState(''); // invoice | exportOrder | importOrder | expense | none
  const [linkId, setLinkId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [baseAmount, setBaseAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('pending'); // pending | completed

  // Load counterparty options
  const { data: suppliersData } = useSuppliers({ limit: 1000 });
  const { data: customersData } = useCustomers({ limit: 1000 });

  const suppliers = suppliersData?.suppliers || [];
  const customers = customersData?.customers || [];

  // Load linkable orders
  const { data: importOrdersData } = useImportOrders({ supplier: counterpartyId, limit: 1000 });
  const { data: exportOrdersData } = useExportOrders({ customer: counterpartyId, limit: 1000 });
  const { data: invoicesData } = useInvoices({ customer: counterpartyId, limit: 1000 });
  // For expenses, load approved & unpaid ones
  const { data: expensesData } = useExpenses({ status: 'approved', paymentStatus: 'unpaid', limit: 1000 });

  const importOrders = importOrdersData?.orders || [];
  const exportOrders = exportOrdersData?.orders || [];
  const invoices = invoicesData?.invoices || [];
  const expenses = expensesData?.expenses || [];

  // Reset counterparty when type changes
  useEffect(() => {
    if (type === 'inbound') {
      setCounterpartyType('customer');
    } else {
      setCounterpartyType('supplier');
    }
    setCounterpartyId('');
    setCounterpartyName('');
    setLinkType('');
    setLinkId('');
  }, [type]);

  // Handle counterparty selection
  const handleCounterpartyChange = (e) => {
    const id = e.target.value;
    setCounterpartyId(id);
    setLinkId('');

    if (counterpartyType === 'customer') {
      const cust = customers.find(c => c._id === id);
      setCounterpartyName(cust ? cust.companyName : '');
    } else if (counterpartyType === 'supplier') {
      const supp = suppliers.find(s => s._id === id);
      setCounterpartyName(supp ? supp.companyName : '');
    } else {
      setCounterpartyName('');
    }
  };

  // Sync exchange rate when currency or baseCurrency changes
  useEffect(() => {
    if (currency === baseCurrency) {
      setExchangeRate(1);
    } else {
      const rateBase = baseCurrency === 'USD' ? 1 : rates[baseCurrency];
      const rateCurr = currency === 'USD' ? 1 : rates[currency];
      
      if (rateBase && rateCurr) {
        setExchangeRate(Math.round((rateBase / rateCurr) * 1000000) / 1000000);
      } else {
        setExchangeRate(1);
      }
    }
  }, [currency, baseCurrency, rates]);

  // Sync base amount
  useEffect(() => {
    const amt = parseFloat(amount) || 0;
    const rate = parseFloat(exchangeRate) || 1;
    setBaseAmount(Math.round((amt * rate) * 100) / 100);
  }, [amount, exchangeRate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      return toast.error('Amount must be greater than zero.');
    }
    if (!paymentMethod) {
      return toast.error('Payment method is required.');
    }
    if (counterpartyType !== 'other' && !counterpartyId) {
      return toast.error('Please select a valid counterparty.');
    }
    if (!linkType || !linkId) {
      return toast.error('Link this payment to an order, invoice, or expense.');
    }

    const payload = {
      type,
      status,
      counterpartyType,
      counterpartyId: counterpartyId || null,
      counterpartyName: counterpartyType === 'other' ? 'Other Counterparty' : counterpartyName,
      amount: parseFloat(amount),
      currency,
      exchangeRate: parseFloat(exchangeRate),
      amountInBaseCurrency: baseAmount,
      paymentMethod,
      referenceNumber,
      bankAccount,
      paymentDate: paymentDate ? new Date(paymentDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes
    };

    // Apply polymorphic link
    if (linkType === 'invoice' && linkId) payload.invoice = linkId;
    if (linkType === 'exportOrder' && linkId) payload.exportOrder = linkId;
    if (linkType === 'importOrder' && linkId) payload.importOrder = linkId;
    if (linkType === 'expense' && linkId) payload.expense = linkId;

    try {
      await createPaymentMutation.mutateAsync(payload);
      toast.success('Payment recorded successfully.');
      navigate('/finance/payments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/finance/payments')}
          className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Record Payment</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record a new inbound customer receipt or outbound supplier payment.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 text-slate-800 text-xs">
        {/* Row 1: Payment Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Payment Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="inbound"
                  checked={type === 'inbound'}
                  onChange={() => setType('inbound')}
                  className="text-teal-650 focus:ring-teal-500"
                />
                <span>Inbound (Receivable from Customer)</span>
              </label>
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="outbound"
                  checked={type === 'outbound'}
                  onChange={() => setType('outbound')}
                  className="text-teal-650 focus:ring-teal-500"
                />
                <span>Outbound (Payable to Supplier/Other)</span>
              </label>
            </div>
          </div>

          {/* Status selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Payment Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="pending">Pending Audit (Awaiting Bank Confirmation)</option>
              <option value="completed">Completed (Funds Cleared)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Counterparty */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Counterparty Type</label>
            <select
              value={counterpartyType}
              onChange={(e) => {
                setCounterpartyType(e.target.value);
                setCounterpartyId('');
                setCounterpartyName('');
              }}
              disabled={type === 'inbound'} // inbound is customer-only
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
            >
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
              <option value="bank">Bank</option>
              <option value="government">Government</option>
              <option value="other">Other Party</option>
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Counterparty Name</label>
            {counterpartyType === 'customer' ? (
              <select
                value={counterpartyId}
                onChange={handleCounterpartyChange}
                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              >
                <option value="">Select a Customer...</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>{c.companyName} ({c.code})</option>
                ))}
              </select>
            ) : counterpartyType === 'supplier' ? (
              <select
                value={counterpartyId}
                onChange={handleCounterpartyChange}
                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              >
                <option value="">Select a Supplier...</option>
                {suppliers.map(s => (
                  <option key={s._id} value={s._id}>{s.companyName} ({s.code})</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="Enter counterparty company or agency name..."
                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              />
            )}
          </div>
        </div>

        {/* Row 3: Polymorphic Order Links */}
        {counterpartyId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Link to Document</label>
              <select
                value={linkType}
                onChange={(e) => { setLinkType(e.target.value); setLinkId(''); }}
                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="" disabled>Select link type...</option>
                {counterpartyType === 'customer' && (
                  <>
                    <option value="invoice">Customer Invoice</option>
                    <option value="exportOrder">Sales Order (SO)</option>
                  </>
                )}
                {counterpartyType === 'supplier' && (
                  <option value="importOrder">Purchase Order (PO)</option>
                )}
                {counterpartyType === 'supplier' && (
                  <option value="expense">Approved Expense</option>
                )}
              </select>
            </div>

            {linkType && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Select Document</label>
                {linkType === 'invoice' && (
                  <select
                    value={linkId}
                    onChange={(e) => setLinkId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select Invoice...</option>
                    {invoices.map(i => (
                      <option key={i._id} value={i._id}>
                        {i.invoiceNumber} (Total: ${i.grandTotal.toLocaleString()} | Due: ${i.amountDue.toLocaleString()})
                      </option>
                    ))}
                  </select>
                )}

                {linkType === 'exportOrder' && (
                  <select
                    value={linkId}
                    onChange={(e) => setLinkId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select Sales Order...</option>
                    {exportOrders.map(o => (
                      <option key={o._id} value={o._id}>
                        {o.orderNumber} (Total: ${o.grandTotal.toLocaleString()} | Status: {o.paymentStatus})
                      </option>
                    ))}
                  </select>
                )}

                {linkType === 'importOrder' && (
                  <select
                    value={linkId}
                    onChange={(e) => setLinkId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select Purchase Order...</option>
                    {importOrders.map(o => (
                      <option key={o._id} value={o._id}>
                        {o.poNumber} (Total: ${o.grandTotal.toLocaleString()} | Status: {o.status})
                      </option>
                    ))}
                  </select>
                )}

                {linkType === 'expense' && (
                  <select
                    value={linkId}
                    onChange={(e) => setLinkId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  >
                    <option value="">Select Expense...</option>
                    {expenses.map(e => (
                      <option key={e._id} value={e._id}>
                        {e.expenseNumber} — {e.title} (${e.amount.toLocaleString()} {e.currency})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {/* Row 4: Pricing & Multi-currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {['USD', 'EUR', 'GBP', 'SGD', 'CNY', 'JPY', 'AUD', 'CAD', 'MYR', 'IDR', 'THB', 'INR', 'AED', 'SAR'].map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Exchange Rate (to {baseCurrency})</label>
            <input
              type="number"
              step="0.000001"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Base Value ({baseCurrency})</label>
            <input
              type="text"
              value={`${baseCurrency} ${baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              readOnly
              className="w-full text-xs font-bold text-slate-500 bg-slate-50 border border-slate-250 rounded-lg p-2 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Row 5: Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="bank_transfer">Bank Wire Transfer</option>
              <option value="letter_of_credit">Letter of Credit (L/C)</option>
              <option value="credit_card">Corporate Credit Card</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="other">Other Method</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Reference Number</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. Bank SWIFT Ref, Cheque #, TXID"
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Bank Account</label>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="e.g. Citi USD Corporate Accounts"
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Row 6: Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Payment/Record Date</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Payment Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Notes / Remarks</label>
          <textarea
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal transaction descriptions, routing instructions, or counterparty communications..."
            className="w-full text-xs font-semibold text-slate-750 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/finance/payments')}
            className="btn-secondary py-2 px-4 font-bold text-xs"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={createPaymentMutation.isLoading}
            className="btn-primary flex items-center gap-1.5 py-2 px-5 text-xs font-bold shadow-teal-500/10"
          >
            {createPaymentMutation.isLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Save size={14} />
            )}
            <span>Save Payment</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
