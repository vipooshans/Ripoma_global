import React, { useState } from 'react';
import { 
  Plus, 
  Map, 
  Layers, 
  Scale, 
  TrendingUp, 
  Calendar, 
  Eye,
  CheckCircle,
  HelpCircle,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  useTaxDuty, 
  useTaxDutySummary, 
  useCreateTaxDuty, 
  useUpdateTaxDutyStatus 
} from '../../hooks/useTaxDuty';
import { useImportOrders } from '../../hooks/useImportOrders';
import { useExportOrders } from '../../hooks/useExportOrders';
import { useShipments } from '../../hooks/useShipments';
import { TaxTypeBadge, TaxStatusBadge } from '../../components/finance/TaxTypeBadge';
import OverduePill from '../../components/finance/OverduePill';
import CurrencyAmountDisplay from '../../components/finance/CurrencyAmountDisplay';
import { useAuth } from '../../hooks/useAuth';

const TaxDuty = () => {
  const { hasPermission } = useAuth();

  // Filter States
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // UI state
  const [groupedView, setGroupedView] = useState(false);
  const [collapsedCountries, setCollapsedCountries] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Queries
  const { data: summary, isLoading: summaryLoading } = useTaxDutySummary();
  const { data: records, isLoading: recordsLoading, refetch } = useTaxDuty({
    type,
    status,
    country,
    dateFrom,
    dateTo
  });

  // Mutations
  const createMutation = useCreateTaxDuty();
  const updateStatusMutation = useUpdateTaxDutyStatus();

  // Dialog Form States
  const [newType, setNewType] = useState('import_duty');
  const [newStatus, setNewStatus] = useState('pending');
  const [newCountry, setNewCountry] = useState('USA');
  const [newHsCode, setNewHsCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTaxableVal, setNewTaxableVal] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCurrency, setNewCurrency] = useState('USD');
  const [newDueDate, setNewDueDate] = useState('');
  const [newLinkType, setNewLinkType] = useState(''); // importOrder | exportOrder | shipment | none
  const [newLinkId, setNewLinkId] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Dropdowns lists
  const { data: importOrdersData } = useImportOrders({ limit: 1000 });
  const { data: exportOrdersData } = useExportOrders({ limit: 1000 });
  const { data: shipmentsData } = useShipments({ limit: 1000 });

  const importOrders = importOrdersData?.orders || [];
  const exportOrders = exportOrdersData?.orders || [];
  const shipments = shipmentsData?.shipments || [];

  const format = (val) => {
    return (val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      toast.success(`Tax record status updated to ${newStatus}.`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tax status.');
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!newAmount || parseFloat(newAmount) <= 0) {
      return toast.error('Amount must be greater than zero.');
    }

    const payload = {
      type: newType,
      status: newStatus,
      country: newCountry,
      hsCode: newHsCode,
      description: newDesc,
      taxableValue: newTaxableVal ? parseFloat(newTaxableVal) : null,
      rate: newRate ? parseFloat(newRate) : null,
      amount: parseFloat(newAmount),
      currency: newCurrency,
      dueDate: newDueDate ? new Date(newDueDate) : null,
      notes: newNotes,
      importOrder: newLinkType === 'importOrder' && newLinkId ? newLinkId : null,
      exportOrder: newLinkType === 'exportOrder' && newLinkId ? newLinkId : null,
      shipment: newLinkType === 'shipment' && newLinkId ? newLinkId : null
    };

    try {
      await createMutation.mutateAsync(payload);
      toast.success('Tax/Duty record registered successfully.');
      setShowAddModal(false);
      
      // Reset form
      setNewType('import_duty');
      setNewStatus('pending');
      setNewCountry('USA');
      setNewHsCode('');
      setNewDesc('');
      setNewTaxableVal('');
      setNewRate('');
      setNewAmount('');
      setNewDueDate('');
      setNewLinkType('');
      setNewLinkId('');
      setNewNotes('');

      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tax record.');
    }
  };

  const toggleCollapse = (cName) => {
    setCollapsedCountries(prev => ({
      ...prev,
      [cName]: !prev[cName]
    }));
  };

  // Grouping rows by country in Javascript
  const getGroupedRecords = () => {
    if (!records) return {};
    const grouped = {};
    records.forEach(r => {
      const c = r.country || 'International';
      if (!grouped[c]) {
        grouped[c] = {
          country: c,
          totalBaseAmount: 0,
          rows: []
        };
      }
      grouped[c].rows.push(r);
      grouped[c].totalBaseAmount += r.amountInBaseCurrency || 0;
    });
    return grouped;
  };

  const groupedRecords = getGroupedRecords();

  const taxTypes = [
    { key: 'import_duty', label: 'Import Duty' },
    { key: 'export_duty', label: 'Export Duty' },
    { key: 'vat', label: 'VAT' },
    { key: 'gst', label: 'GST' },
    { key: 'excise', label: 'Excise' },
    { key: 'withholding_tax', label: 'Withholding Tax' },
    { key: 'customs_fee', label: 'Customs Fee' },
    { key: 'other', label: 'Other Tax' }
  ];

  return (
    <div className="space-y-6 text-slate-800 text-xs">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tax & Duty Center</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Log and review import customs tariffs, VAT collections, withholding taxes, and GST filings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setGroupedView(!groupedView)}
            className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Map size={14} className="text-slate-450" />
            <span>{groupedView ? 'Flat Ledger View' : 'Group by Country'}</span>
          </button>
          
          {hasPermission('finance:write') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10 font-bold"
            >
              <Plus size={14} />
              <span>Record Tax/Duty</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Taxes Filed (YTD)</span>
          <p className="text-xl font-extrabold text-slate-950 mt-1 tracking-tight">
            {summaryLoading ? '...' : `$${format(summary?.stats?.totalFiledYTD)}`}
          </p>
          <span className="text-[9px] text-slate-450 mt-1 block">Taxes marked in filed status</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Taxes Paid (YTD)</span>
          <p className="text-xl font-extrabold text-teal-655 mt-1 tracking-tight">
            {summaryLoading ? '...' : `$${format(summary?.stats?.totalPaidYTD)}`}
          </p>
          <span className="text-[9px] text-teal-500/80 font-bold mt-1 block">Settled customs duties</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Due in 30 Days</span>
          <p className="text-xl font-extrabold text-orange-650 mt-1 tracking-tight">
            {summaryLoading ? '...' : `$${format(summary?.stats?.dueSoon30Days)}`}
          </p>
          <span className="text-[9px] text-orange-550 font-bold mt-1 block">Taxes due with deadline alert</span>
        </div>
      </div>

      {/* Filters ledger */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Type */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Tax Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Types</option>
            {taxTypes.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Filing Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="filed">Filed</option>
            <option value="paid">Paid</option>
            <option value="disputed">Disputed</option>
            <option value="exempt">Exempt</option>
          </select>
        </div>

        {/* Country */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Jurisdiction Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. Singapore, USA"
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Due Date Range From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Flat view table vs Grouped View */}
      {!groupedView ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-5">TAX #</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Country</th>
                  <th className="py-3 px-5">Linked To</th>
                  <th className="py-3 px-5 text-center">HS Code</th>
                  <th className="py-3 px-5 text-right">Taxable Value</th>
                  <th className="py-3 px-5 text-right">Rate</th>
                  <th className="py-3 px-5 text-right">Base Amount</th>
                  <th className="py-3 px-5">Due Date</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {recordsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="11" className="py-4 h-12 bg-slate-50/50" />
                    </tr>
                  ))
                ) : (!records || records.length === 0) ? (
                  <tr>
                    <td colSpan="11" className="py-12 text-center text-slate-400 font-medium">
                      No tax or duty records found.
                    </td>
                  </tr>
                ) : (
                  records.map(r => {
                    let linked = 'None';
                    if (r.importOrder) linked = `PO: ${r.importOrder.poNumber}`;
                    else if (r.exportOrder) linked = `SO: ${r.exportOrder.orderNumber}`;
                    else if (r.shipment) linked = `SH: ${r.shipment.shipmentNumber}`;

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-3.5 px-5 font-mono font-bold text-teal-650">{r.recordNumber}</td>
                        <td className="py-3.5 px-5">
                          <TaxTypeBadge type={r.type} />
                        </td>
                        <td className="py-3.5 px-5 font-bold text-slate-700">{r.country}</td>
                        <td className="py-3.5 px-5 font-semibold text-slate-500">{linked}</td>
                        <td className="py-3.5 px-5 text-center font-mono font-bold text-slate-450">{r.hsCode || 'N/A'}</td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-600">
                          {r.taxableValue ? `$${format(r.taxableValue)}` : 'N/A'}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-455">
                          {r.rate ? `${r.rate}%` : 'N/A'}
                        </td>
                        <td className="py-3.5 px-5 text-right font-extrabold">
                          <CurrencyAmountDisplay
                            amount={r.amountInBaseCurrency}
                            originalAmount={r.amount}
                            originalCurrency={r.currency}
                          />
                        </td>
                        <td className="py-3.5 px-5 font-semibold">
                          <div className="flex flex-col gap-1 items-start">
                            <span>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'N/A'}</span>
                            {r.status !== 'paid' && <OverduePill dueDate={r.dueDate} />}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <TaxStatusBadge status={r.status} />
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center justify-center gap-1.5">
                            {hasPermission('finance:write') && r.status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(r._id, 'filed')}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors"
                                title="Mark Filed"
                              >
                                <CheckCircle size={14} className="text-slate-400 hover:text-blue-500" />
                              </button>
                            )}
                            {hasPermission('finance:write') && (r.status === 'pending' || r.status === 'filed') && (
                              <button
                                onClick={() => handleStatusChange(r._id, 'paid')}
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-slate-100 transition-colors"
                                title="Mark Paid"
                              >
                                <CheckCircle size={14} className="text-slate-400 hover:text-emerald-500" />
                              </button>
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
        </div>
      ) : (
        // Grouped View (Country Sections)
        <div className="space-y-4">
          {recordsLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center animate-pulse text-slate-400">
              Loading country-grouped data...
            </div>
          ) : Object.keys(groupedRecords).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
              No tax or duty records found to group.
            </div>
          ) : (
            Object.keys(groupedRecords).map(cName => {
              const countryGroup = groupedRecords[cName];
              const isCollapsed = collapsedCountries[cName];

              return (
                <div key={cName} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Collapsible header */}
                  <div
                    onClick={() => toggleCollapse(cName)}
                    className="px-5 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-all select-none"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? <ChevronRight size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      <span className="font-extrabold text-slate-800 text-sm">{cName}</span>
                      <span className="text-[10px] text-slate-450 font-medium">({countryGroup.rows.length} records)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase mr-2">Total Liability:</span>
                      <span className="font-mono font-extrabold text-slate-900">${format(countryGroup.totalBaseAmount)}</span>
                    </div>
                  </div>

                  {/* Collapsible body */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-slate-800 text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                            <th className="py-2.5 px-5">TAX #</th>
                            <th className="py-2.5 px-5">Type</th>
                            <th className="py-2.5 px-5">Linked To</th>
                            <th className="py-2.5 px-5 text-center">HS Code</th>
                            <th className="py-2.5 px-5 text-right">Taxable Value</th>
                            <th className="py-2.5 px-5 text-right">Rate</th>
                            <th className="py-2.5 px-5 text-right">Base Amount</th>
                            <th className="py-2.5 px-5">Due Date</th>
                            <th className="py-2.5 px-5">Status</th>
                            <th className="py-2.5 px-5 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {countryGroup.rows.map(r => {
                            let linked = 'None';
                            if (r.importOrder) linked = `PO: ${r.importOrder.poNumber}`;
                            else if (r.exportOrder) linked = `SO: ${r.exportOrder.orderNumber}`;
                            else if (r.shipment) linked = `SH: ${r.shipment.shipmentNumber}`;

                            return (
                              <tr key={r._id} className="hover:bg-slate-50/30">
                                <td className="py-3 px-5 font-mono font-bold text-teal-650">{r.recordNumber}</td>
                                <td className="py-3 px-5">
                                  <TaxTypeBadge type={r.type} />
                                </td>
                                <td className="py-3 px-5 font-semibold text-slate-550">{linked}</td>
                                <td className="py-3 px-5 text-center font-mono font-bold text-slate-450">{r.hsCode || 'N/A'}</td>
                                <td className="py-3 px-5 text-right font-mono font-bold text-slate-650">
                                  {r.taxableValue ? `$${format(r.taxableValue)}` : 'N/A'}
                                </td>
                                <td className="py-3 px-5 text-right font-mono font-bold text-slate-455">
                                  {r.rate ? `${r.rate}%` : 'N/A'}
                                </td>
                                <td className="py-3 px-5 text-right font-extrabold">
                                  <CurrencyAmountDisplay
                                    amount={r.amountInBaseCurrency}
                                    originalAmount={r.amount}
                                    originalCurrency={r.currency}
                                  />
                                </td>
                                <td className="py-3 px-5 font-semibold">
                                  <div className="flex flex-col gap-1 items-start">
                                    <span>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : 'N/A'}</span>
                                    {r.status !== 'paid' && <OverduePill dueDate={r.dueDate} />}
                                  </div>
                                </td>
                                <td className="py-3 px-5">
                                  <TaxStatusBadge status={r.status} />
                                </td>
                                <td className="py-3 px-5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {hasPermission('finance:write') && r.status === 'pending' && (
                                      <button
                                        onClick={() => handleStatusChange(r._id, 'filed')}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-500 transition-all"
                                        title="Mark Filed"
                                      >
                                        <CheckCircle size={14} />
                                      </button>
                                    )}
                                    {hasPermission('finance:write') && (r.status === 'pending' || r.status === 'filed') && (
                                      <button
                                        onClick={() => handleStatusChange(r._id, 'paid')}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-500 transition-all"
                                        title="Mark Paid"
                                      >
                                        <CheckCircle size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Tax/Duty Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm">Record Tax & Duty Liability</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-slate-450 hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateRecord} className="p-6 space-y-4">
              {/* Type & Country */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Tax Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {taxTypes.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Filing Jurisdiction (Country)</label>
                  <input
                    type="text"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="e.g. Singapore, USA"
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              {/* HS Code & Description */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">HS Code</label>
                  <input
                    type="text"
                    value={newHsCode}
                    onChange={(e) => setNewHsCode(e.target.value)}
                    placeholder="e.g. 8471.30.10"
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Item Description</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Electronic processing equipment tariffs"
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Taxable Value, Rate, Amount */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-150">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Taxable Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTaxableVal}
                    onChange={(e) => setNewTaxableVal(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs font-bold text-slate-705 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="0.0%"
                    className="w-full text-xs font-bold text-slate-705 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Total Tax ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xs font-bold text-slate-705 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Link Operation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Link Operation Type</label>
                  <select
                    value={newLinkType}
                    onChange={(e) => { setNewLinkType(e.target.value); setNewLinkId(''); }}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">No Link</option>
                    <option value="importOrder">Purchase Order (PO)</option>
                    <option value="exportOrder">Sales Order (SO)</option>
                    <option value="shipment">Shipment Ledger</option>
                  </select>
                </div>

                {newLinkType && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Linked Record</label>
                    {newLinkType === 'importOrder' && (
                      <select
                        value={newLinkId}
                        onChange={(e) => setNewLinkId(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none"
                        required
                      >
                        <option value="">Select PO...</option>
                        {importOrders.map(o => (
                          <option key={o._id} value={o._id}>{o.poNumber}</option>
                        ))}
                      </select>
                    )}
                    {newLinkType === 'exportOrder' && (
                      <select
                        value={newLinkId}
                        onChange={(e) => setNewLinkId(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none"
                        required
                      >
                        <option value="">Select SO...</option>
                        {exportOrders.map(o => (
                          <option key={o._id} value={o._id}>{o.orderNumber}</option>
                        ))}
                      </select>
                    )}
                    {newLinkType === 'shipment' && (
                      <select
                        value={newLinkId}
                        onChange={(e) => setNewLinkId(e.target.value)}
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none"
                        required
                      >
                        <option value="">Select Shipment...</option>
                        {shipments.map(s => (
                          <option key={s._id} value={s._id}>{s.shipmentNumber}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Due Date & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="SGD">SGD</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary py-1.5 px-4 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading}
                  className="btn-primary flex items-center gap-1.5 py-1.5 px-5 text-xs font-bold"
                >
                  {createMutation.isLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxDuty;
