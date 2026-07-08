import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, UploadCloud, File, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { useCreateExpense, useUpdateExpense, useExpenseDetail } from '../../hooks/useExpenses';
import { useBaseCurrency, useCurrencyRates } from '../../hooks/useCurrencyRates';
import { useImportOrders } from '../../hooks/useImportOrders';
import { useExportOrders } from '../../hooks/useExportOrders';

const ExpenseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const { data: detail, isLoading: detailLoading } = useExpenseDetail(id);

  const { data: baseData } = useBaseCurrency();
  const baseCurrency = baseData?.baseCurrency || 'USD';
  const { data: rateDoc } = useCurrencyRates();
  const rates = rateDoc?.rates || {};

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('freight');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [baseAmount, setBaseAmount] = useState(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState('');
  const [invoiceReference, setInvoiceReference] = useState('');
  const [linkType, setLinkType] = useState(''); // importOrder | exportOrder | none
  const [linkId, setLinkId] = useState('');
  const [notes, setNotes] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileUploadProgress, setFileUploadProgress] = useState(0);

  // Linkable documents dropdowns
  const { data: importOrdersData } = useImportOrders({ limit: 1000 });
  const { data: exportOrdersData } = useExportOrders({ limit: 1000 });

  const importOrders = importOrdersData?.orders || [];
  const exportOrders = exportOrdersData?.orders || [];

  // Populate form if editing
  useEffect(() => {
    if (isEdit && detail) {
      setTitle(detail.title || '');
      setCategory(detail.category || 'freight');
      setAmount(detail.amount || '');
      setCurrency(detail.currency || 'USD');
      setExchangeRate(detail.exchangeRate || 1);
      setExpenseDate(detail.expenseDate ? new Date(detail.expenseDate).toISOString().split('T')[0] : '');
      setVendor(detail.vendor || '');
      setInvoiceReference(detail.invoiceReference || '');
      setNotes(detail.notes || '');
      setFileUrl(detail.receiptUrl || '');
      
      if (detail.importOrder) {
        setLinkType('importOrder');
        setLinkId(detail.importOrder._id || detail.importOrder);
      } else if (detail.exportOrder) {
        setLinkType('exportOrder');
        setLinkId(detail.exportOrder._id || detail.exportOrder);
      } else {
        setLinkType('');
        setLinkId('');
      }
    }
  }, [isEdit, detail]);

  // Sync exchange rate on currency select
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

  // Drag and Drop file receipt upload mock
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Simulate progress upload to S3 bucket
    setFileUploadProgress(10);
    const interval = setInterval(() => {
      setFileUploadProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setFileUrl(`/uploads/${file.name}`); // Mock path for testing
          toast.success('Receipt receipt file uploaded successfully.');
          return 100;
        }
        return p + 25;
      });
    }, 150);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: { 'image/*': [], 'application/pdf': [] }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      return toast.error('Amount must be greater than zero.');
    }

    const payload = {
      title,
      category,
      amount: parseFloat(amount),
      currency,
      exchangeRate: parseFloat(exchangeRate),
      amountInBaseCurrency: baseAmount,
      expenseDate: new Date(expenseDate),
      vendor,
      invoiceReference,
      notes,
      receiptUrl: fileUrl,
      importOrder: linkType === 'importOrder' && linkId ? linkId : null,
      exportOrder: linkType === 'exportOrder' && linkId ? linkId : null
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, payload });
        toast.success('Draft expense updated successfully.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Expense created in draft.');
      }
      navigate('/finance/expenses');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense.');
    }
  };

  const categories = [
    'freight', 'customs_duty', 'import_tax', 'export_tax', 'port_charges', 'handling',
    'insurance', 'inspection', 'certification', 'warehousing', 'packaging',
    'bank_charges', 'currency_conversion', 'agent_fees', 'legal', 'audit',
    'travel', 'utilities', 'salaries', 'office', 'marketing', 'other'
  ];

  if (isEdit && detailLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-teal-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/finance/expenses')}
          className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isEdit ? `Edit Expense: ${detail?.expenseNumber}` : 'Log Expense'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isEdit ? 'Modify draft expense details before submission.' : 'Add a new business expense, warehouse charge, or customs payout.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 text-slate-800 text-xs">
        {/* Row 1: Title & Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Expense Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Customs Import Duties Shipment C-202"
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 capitalize"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Pricing & Conversion */}
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
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
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

        {/* Row 3: Vendor & Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Vendor / Payee</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. DHL Express, Customs Authority"
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Invoice Reference</label>
            <input
              type="text"
              value={invoiceReference}
              onChange={(e) => setInvoiceReference(e.target.value)}
              placeholder="e.g. INV-1002931-DHL"
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Expense Date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>
        </div>

        {/* Row 4: Document Association Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Link to Operations</label>
            <select
              value={linkType}
              onChange={(e) => { setLinkType(e.target.value); setLinkId(''); }}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">No Link</option>
              <option value="importOrder">Purchase Order (PO)</option>
              <option value="exportOrder">Sales Order (SO)</option>
            </select>
          </div>

          {linkType && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Select Linked Record</label>
              {linkType === 'importOrder' && (
                <select
                  value={linkId}
                  onChange={(e) => setLinkId(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                >
                  <option value="">Select PO...</option>
                  {importOrders.map(o => (
                    <option key={o._id} value={o._id}>{o.poNumber} ({o.supplier?.companyName})</option>
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
                  <option value="">Select SO...</option>
                  {exportOrders.map(o => (
                    <option key={o._id} value={o._id}>{o.orderNumber} ({o.customer?.companyName})</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Dropzone File Upload */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Receipt Attachment (PDF/Image)</label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
              isDragActive 
                ? 'border-teal-500 bg-teal-50/20' 
                : fileUrl 
                  ? 'border-emerald-350 bg-emerald-50/10' 
                  : 'border-slate-250 hover:border-teal-400 hover:bg-slate-50/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-1.5">
              <UploadCloud size={28} className={fileUrl ? 'text-emerald-500' : 'text-slate-400'} />
              {fileUrl ? (
                <div>
                  <p className="font-bold text-slate-800 flex items-center justify-center gap-1.5">
                    <File size={14} className="text-emerald-500" />
                    <span>Receipt uploaded successfully!</span>
                  </p>
                  <p className="text-[10px] text-slate-450 mt-0.5">Click or drag another file to replace</p>
                </div>
              ) : isDragActive ? (
                <p className="text-xs font-bold text-teal-655">Drop the files here...</p>
              ) : (
                <div>
                  <p className="font-bold text-slate-750">Drag & drop receipt invoice file, or click to upload</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Supports PDF, PNG, and JPEG formats (Max 5MB)</p>
                </div>
              )}

              {fileUploadProgress > 0 && fileUploadProgress < 100 && (
                <div className="w-full max-w-xs mt-3 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-teal-500 h-1.5 transition-all duration-150" style={{ width: `${fileUploadProgress}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Expense Notes / Purpose</label>
          <textarea
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Outline business purposes, audit descriptions, routing terms, etc."
            className="w-full text-xs font-semibold text-slate-705 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Save and submit buttons */}
        <div className="pt-3 border-t border-slate-100 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 py-1.5 px-3 rounded-lg shadow-sm">
              <AlertCircle size={14} />
              <span>Note: This expense will require manager approval before payment can be recorded.</span>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/finance/expenses')}
                className="btn-secondary py-2 px-4 font-bold text-xs"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={createMutation.isLoading || updateMutation.isLoading}
                className="btn-primary flex items-center gap-1.5 py-2 px-5 text-xs font-bold shadow-teal-500/10"
              >
                {createMutation.isLoading || updateMutation.isLoading ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Save size={14} />
                )}
                <span>{isEdit ? 'Update Draft' : 'Save as Draft'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
