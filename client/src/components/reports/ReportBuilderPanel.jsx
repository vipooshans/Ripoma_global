import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Save, Settings, Filter } from 'lucide-react';

const ReportBuilderPanel = ({
  definition,
  onSave,
  onRun,
  isSaving = false,
  isRunning = false
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('sales');
  const [preset, setPreset] = useState('last_30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupBy, setGroupBy] = useState('month');
  
  // Columns state
  const [columns, setColumns] = useState([]);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [limit, setLimit] = useState(100);
  const [isShared, setIsShared] = useState(false);

  // Dynamic filters
  const [filters, setFilters] = useState([]); // Array of { field, operator, value }

  // Available column checklists based on report type
  const columnsMap = {
    sales: [
      { key: 'month', label: 'Month' },
      { key: 'orders', label: 'Orders Count' },
      { key: 'revenue', label: 'Revenue total' },
      { key: 'avgOrderValue', label: 'Avg Order Value' },
      { key: 'growth', label: 'Growth %' },
      { key: 'pctTotal', label: '% of Total' }
    ],
    financial: [
      { key: 'customerName', label: 'Customer Name' },
      { key: 'invoiceNumber', label: 'Invoice / PAY Ref' },
      { key: 'amount', label: 'Total Amount' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'daysOverdue', label: 'Days Overdue' },
      { key: 'bucket', label: 'Ageing Bucket' }
    ]
  };

  // Available dynamic filter keys based on report type
  const filterFieldsMap = {
    sales: [
      { value: 'currency', label: 'Order Currency' },
      { value: 'paymentStatus', label: 'Payment Status' }
    ],
    financial: [
      { value: 'status', label: 'Payment status' }
    ]
  };

  // Sync state if editing an existing definition
  useEffect(() => {
    if (definition) {
      setName(definition.name || '');
      setDescription(definition.description || '');
      setType(definition.type || 'sales');
      setPreset(definition.config?.dateRangePreset || 'last_30d');
      setDateFrom(definition.config?.dateFrom ? definition.config.dateFrom.split('T')[0] : '');
      setDateTo(definition.config?.dateTo ? definition.config.dateTo.split('T')[0] : '');
      setGroupBy(definition.config?.groupBy || 'month');
      setColumns(definition.config?.columns || []);
      setSortBy(definition.config?.sortBy || '');
      setSortOrder(definition.config?.sortOrder || 'desc');
      setLimit(definition.config?.limit || 100);
      setIsShared(definition.isShared || false);

      // Parse filters Map into array
      if (definition.config?.filters) {
        const parsed = [];
        const filterMap = definition.config.filters;
        // Check if Map or Object
        const entries = filterMap instanceof Map ? filterMap.entries() : Object.entries(filterMap);
        for (const [key, value] of entries) {
          parsed.push({ field: key, operator: 'equals', value });
        }
        setFilters(parsed);
      } else {
        setFilters([]);
      }
    } else {
      // Defaults for new report
      setName('');
      setDescription('');
      setType('sales');
      setPreset('last_30d');
      setDateFrom('');
      setDateTo('');
      setGroupBy('month');
      setColumns(columnsMap.sales.map(c => c.key));
      setSortBy('revenue');
      setSortOrder('desc');
      setLimit(100);
      setFilters([]);
      setIsShared(false);
    }
  }, [definition]);

  // Adjust defaults when report type shifts
  useEffect(() => {
    if (!definition) {
      const defaultCols = columnsMap[type] || [];
      setColumns(defaultCols.map(c => c.key));
      setSortBy(type === 'sales' ? 'revenue' : 'amount');
      setFilters([]);
    }
  }, [type]);

  const handleAddFilter = () => {
    const fields = filterFieldsMap[type] || [];
    if (fields.length > 0) {
      setFilters(prev => [...prev, { field: fields[0].value, operator: 'equals', value: '' }]);
    }
  };

  const handleRemoveFilter = (idx) => {
    setFilters(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFilterChange = (idx, key, val) => {
    setFilters(prev => {
      const updated = [...prev];
      updated[idx][key] = val;
      return updated;
    });
  };

  const handleColumnToggle = (colKey) => {
    setColumns(prev => {
      if (prev.includes(colKey)) {
        return prev.filter(c => c !== colKey);
      } else {
        return [...prev, colKey];
      }
    });
  };

  const constructPayload = () => {
    // Convert filter array to key-value Map object
    const filterMap = {};
    filters.forEach(f => {
      if (f.field && f.value) {
        filterMap[f.field] = f.value;
      }
    });

    return {
      name,
      description,
      type,
      config: {
        dateRangePreset: preset,
        dateFrom: preset === 'custom' && dateFrom ? new Date(dateFrom) : undefined,
        dateTo: preset === 'custom' && dateTo ? new Date(dateTo) : undefined,
        groupBy,
        filters: filterMap,
        columns,
        sortBy,
        sortOrder,
        limit
      },
      isShared
    };
  };

  const handleSave = () => {
    if (!name) {
      alert('Please enter a name for the report definition.');
      return;
    }
    onSave(constructPayload());
  };

  const handleRun = () => {
    onRun(constructPayload());
  };

  const availableColumns = columnsMap[type] || [];
  const availableFilters = filterFieldsMap[type] || [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6 font-sans">
      
      {/* Title Config Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Report Template Title</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales by Product Q3..."
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Report Focus Area</label>
          <select
            value={type}
            disabled={!!definition} // Lock type if editing
            onChange={(e) => setType(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="sales">Sales & Revenue</option>
            <option value="financial">Financial Owed (Ageing)</option>
          </select>
        </div>
        <div className="sm:col-span-2 space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the target audience or query parameters..."
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 h-16 resize-none"
          />
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Date Horizon presets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Time Horizon</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="last_7d">Last 7 Days</option>
            <option value="last_30d">Last 30 Days</option>
            <option value="last_90d">Last 90 Days</option>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Start Date</label>
          <input
            type="date"
            value={dateFrom}
            disabled={preset !== 'custom'}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">End Date</label>
          <input
            type="date"
            value={dateTo}
            disabled={preset !== 'custom'}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
          />
        </div>
      </div>

      {/* Axis & Sorting options */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {type === 'sales' && (
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">GroupBy Axis</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="month">Month</option>
              <option value="customer">Customer</option>
              <option value="product">Product</option>
              <option value="country">Country</option>
            </select>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Sort Field</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {availableColumns.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Sort Order</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="asc">Ascending (Low to High)</option>
            <option value="desc">Descending (High to Low)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Limit Rows</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Columns configuration checklist */}
      <div className="space-y-2">
        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Settings size={12} className="text-slate-400" />
          <span>Table Columns Selected</span>
        </label>
        <div className="flex flex-wrap gap-x-6 gap-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          {availableColumns.map(col => (
            <label key={col.key} className="flex items-center gap-2 text-xs font-bold text-slate-650 cursor-pointer selection:bg-transparent">
              <input
                type="checkbox"
                checked={columns.includes(col.key)}
                onChange={() => handleColumnToggle(col.key)}
                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 border-slate-250 cursor-pointer"
              />
              <span>{col.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filters dynamic rows */}
      {availableFilters.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Filter size={12} className="text-slate-400" />
              <span>Matching Filter Criteria</span>
            </label>
            <button
              type="button"
              onClick={handleAddFilter}
              className="text-[10px] font-bold text-teal-650 hover:underline flex items-center gap-0.5"
            >
              <Plus size={12} /> Add Rule
            </button>
          </div>
          
          <div className="space-y-2">
            {filters.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-semibold italic p-3 text-center border border-dashed border-slate-200 rounded-lg">
                No active filter criteria rules configured.
              </p>
            ) : (
              filters.map((filt, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-150">
                  <select
                    value={filt.field}
                    onChange={(e) => handleFilterChange(idx, 'field', e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded p-1 focus:outline-none w-36"
                  >
                    {availableFilters.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <span className="text-[10px] font-bold text-slate-400">is equal to</span>
                  <input
                    type="text"
                    value={filt.value}
                    onChange={(e) => handleFilterChange(idx, 'value', e.target.value)}
                    placeholder="Enter value..."
                    className="text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded p-1 flex-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFilter(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Share / Save options */}
      <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-150 rounded-xl text-xs">
        <label className="flex items-center gap-2 font-bold text-slate-650 cursor-pointer selection:bg-transparent">
          <input
            type="checkbox"
            checked={isShared}
            onChange={(e) => setIsShared(e.target.checked)}
            className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 border-slate-250 cursor-pointer"
          />
          <span>Share with other team members</span>
        </label>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer border-slate-300"
          >
            <Play size={13} />
            <span>{isRunning ? 'Calculating...' : 'Run Report'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export default ReportBuilderPanel;
