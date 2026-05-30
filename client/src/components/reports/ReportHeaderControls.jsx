import React, { useEffect } from 'react';
import { Calendar, Filter, RefreshCw } from 'lucide-react';

const ReportHeaderControls = ({
  filters,
  setFilters,
  onApply,
  showGroupBy = false,
  showDirection = false,
  groupByOptions = [],
  isLoading = false
}) => {
  const presets = [
    { value: 'last_7d', label: 'Last 7 Days' },
    { value: 'last_30d', label: 'Last 30 Days' },
    { value: 'last_90d', label: 'Last 90 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Set initial dates if preset changes
  useEffect(() => {
    if (filters.preset !== 'custom') {
      const now = new Date();
      let start = new Date(now);
      
      switch (filters.preset) {
        case 'last_7d':
          start.setDate(now.getDate() - 7);
          break;
        case 'last_30d':
          start.setDate(now.getDate() - 30);
          break;
        case 'last_90d':
          start.setDate(now.getDate() - 90);
          break;
        case 'this_month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'this_quarter':
          const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
          start = new Date(now.getFullYear(), qStartMonth, 1);
          break;
        case 'this_year':
          start = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          break;
      }
      
      const formatStr = (d) => d.toISOString().split('T')[0];
      setFilters(prev => ({
        ...prev,
        dateFrom: formatStr(start),
        dateTo: formatStr(now)
      }));
    }
  }, [filters.preset]);

  const handleChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-4 font-sans">
      <div className="flex flex-wrap items-end gap-3.5">
        
        {/* Preset Select */}
        <div className="space-y-1 shrink-0">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Calendar size={11} className="text-slate-450" />
            <span>Time Horizon</span>
          </label>
          <select
            value={filters.preset}
            onChange={(e) => handleChange('preset', e.target.value)}
            className="text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 w-44"
          >
            {presets.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Start Date</label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            disabled={filters.preset !== 'custom'}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-white disabled:bg-slate-50 border border-slate-250 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">End Date</label>
          <input
            type="date"
            value={filters.dateTo || ''}
            disabled={filters.preset !== 'custom'}
            onChange={(e) => handleChange('dateTo', e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-white disabled:bg-slate-50 border border-slate-250 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Group By Filter */}
        {showGroupBy && (
          <div className="space-y-1 shrink-0">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Aggregation Axis</label>
            <select
              value={filters.groupBy || ''}
              onChange={(e) => handleChange('groupBy', e.target.value)}
              className="text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 w-36"
            >
              {groupByOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Direction Filter */}
        {showDirection && (
          <div className="space-y-1 shrink-0">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Direction</label>
            <select
              value={filters.direction || 'all'}
              onChange={(e) => handleChange('direction', e.target.value)}
              className="text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500 w-32"
            >
              <option value="all">All Channels</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 shrink-0">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary py-2 px-3.5 text-xs font-bold shadow-teal-500/10 flex items-center gap-1.5 cursor-pointer"
          >
            <Filter size={13} />
            <span>Apply Filters</span>
          </button>
          
          <button
            type="button"
            onClick={onApply}
            disabled={isLoading}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg shadow-sm transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-teal-650' : ''} />
          </button>
        </div>

      </div>
    </form>
  );
};

export default ReportHeaderControls;
