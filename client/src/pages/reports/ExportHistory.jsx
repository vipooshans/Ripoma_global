import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  FileText, 
  Search, 
  Calendar,
  AlertTriangle,
  History
} from 'lucide-react';
import { 
  useReportExports, 
  useDownloadReportExport, 
  useDeleteReportExport 
} from '../../hooks/useReports';
import ExportStatusPoller from '../../components/reports/ExportStatusPoller';
import toast from 'react-hot-toast';

const ExportHistory = () => {
  // Filters state
  const [filters, setFilters] = useState({
    type: '',
    format: '',
    status: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Fetch exports with dynamic polling if any item is generating
  const { data: exports = [], isLoading, refetch } = useReportExports(filters, {
    refetchInterval: (query) => {
      const list = query?.state?.data;
      const hasGenerating = Array.isArray(list) && list.some(item => item.status === 'generating');
      return hasGenerating ? 3000 : false;
    }
  });

  const downloadMutation = useDownloadReportExport();
  const deleteMutation = useDeleteReportExport();

  const handleDownload = async (id) => {
    try {
      const { url } = await downloadMutation.mutateAsync(id);
      window.open(url, '_blank');
      toast.success('Download triggered successfully.');
      refetch();
    } catch (err) {
      toast.error('Failed to retrieve download link.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report file and its history entry? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Export file log deleted.');
      refetch();
    } catch (err) {
      toast.error('Failed to delete export log.');
    }
  };

  const getFormatBadge = (format) => {
    switch (format) {
      case 'xlsx':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">XLSX</span>;
      case 'pdf':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-100 font-mono font-bold">PDF</span>;
      case 'csv':
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-50 text-slate-600 border border-slate-205 font-mono">CSV</span>;
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Calculating';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Local client filter search
  const filteredExports = exports.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(term) ||
      item.type?.toLowerCase().includes(term) ||
      item.generatedBy?.name?.toLowerCase().includes(term) ||
      item.generatedBy?.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="text-teal-650" size={24} />
            <span>Report Export Registry & History</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Access, search, and download generated data tables and sheet exports created by manual triggers or scheduled email crons.
          </p>
        </div>
        <div>
          <button
            onClick={() => { refetch(); toast.success('List updated.'); }}
            className="btn-secondary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 border-slate-250 bg-white"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-teal-650' : ''} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end text-xs">
        
        {/* Search */}
        <div className="space-y-1 flex-1 w-full">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Search Logs</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by file name, builder type, or creator name..."
              className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-lg py-1.5 pl-8 pr-3 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Focus Type */}
        <div className="space-y-1 shrink-0 w-full md:w-36">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Report Focus</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Types</option>
            <option value="sales">Sales & Revenue</option>
            <option value="shipment">Logistics</option>
            <option value="financial">Financial</option>
          </select>
        </div>

        {/* Format */}
        <div className="space-y-1 shrink-0 w-full md:w-32">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">File Format</label>
          <select
            value={filters.format}
            onChange={(e) => setFilters(prev => ({ ...prev, format: e.target.value }))}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Formats</option>
            <option value="xlsx">XLSX (Excel)</option>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1 shrink-0 w-full md:w-32">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="generating">Generating</option>
            <option value="ready">Ready</option>
            <option value="failed">Failed</option>
          </select>
        </div>

      </div>

      {/* Exports Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
        
        {/* Table header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">
            Export Records Found ({filteredExports.length})
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-slate-805">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-5">File Name</th>
                <th className="py-3 px-5 text-center">Type</th>
                <th className="py-3 px-5 text-center">Format</th>
                <th className="py-3 px-5 text-right">Data Rows</th>
                <th className="py-3 px-5 text-right">Size</th>
                <th className="py-3 px-5">Generated By</th>
                <th className="py-3 px-5">Created At</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && exports.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 bg-slate-50 animate-pulse text-center font-bold text-slate-400">Loading export history...</td>
                </tr>
              ) : filteredExports.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 font-semibold italic">
                    No matching report files found in the registry.
                  </td>
                </tr>
              ) : (
                filteredExports.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-700">{item.name}</td>
                    <td className="py-3.5 px-5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-205">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center">{getFormatBadge(item.format)}</td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-600">
                      {item.rowCount !== undefined ? item.rowCount.toLocaleString() : '-'}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-650">
                      {formatSize(item.fileSizeBytes)}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-semibold text-slate-600">
                        {item.generatedBy?.name || 'System Auto-Cron'}
                      </span>
                      {item.generatedBy?.email && (
                        <span className="block text-[9px] text-slate-400">{item.generatedBy.email}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-500">
                      {new Date(item.generatedAt || item.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <ExportStatusPoller status={item.status} onComplete={refetch} />
                    </td>
                    <td className="py-3.5 px-5 text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownload(item._id)}
                          disabled={item.status !== 'ready'}
                          className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-teal-650 rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                          title="Download File"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg shadow-sm transition-all cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

export default ExportHistory;
