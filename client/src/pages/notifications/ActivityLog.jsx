import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityLog } from '../../hooks/useActivityLog';

const ActivityLog = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Expanded log rows for diff viewing
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Params
  const params = {
    page: currentPage,
    limit: itemsPerPage,
    search: search || undefined,
    module: filterModule || undefined,
    action: filterAction || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined
  };

  const { data, isLoading } = useActivityLog(params);

  const logs = data?.logs || [];
  const totalLogs = data?.total || 0;
  const totalPages = data?.pages || 1;

  const toggleExpand = (id) => {
    setExpandedLogId(prev => (prev === id ? null : id));
  };

  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  // Human-readable labels for modules
  const moduleLabels = {
    users: 'Users & Profile',
    inventory: 'Inventory & Products',
    suppliers: 'Suppliers Registry',
    customers: 'Customers Registry',
    import_orders: 'Import Orders (PO)',
    export_orders: 'Export Orders (SO)',
    shipments: 'Shipment Tracking',
    documents: 'Document Library',
    finance: 'Financial Control',
    reports: 'Reporting & Cron',
    notifications: 'Alerts & Reminders',
    system: 'System Events'
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
          <span className="hover:text-slate-350 cursor-pointer" onClick={() => navigate('/admin/users')}>Admin</span>
          <span>/</span>
          <span className="text-slate-300">Audit Log</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Platform Activity Audit Log
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/50">
            Read-only Trail
          </span>
        </h1>
        <p className="text-slate-400 text-xs mt-0.5">Immutable administrative log of all records created, updated or deleted across the system.</p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {/* Keyword Search */}
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Search Logs</label>
            <input
              type="text"
              placeholder="Search user, description, or reference ID..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none placeholder-slate-600"
            />
          </div>

          {/* Module Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Module</label>
            <select
              value={filterModule}
              onChange={(e) => handleFilterChange(setFilterModule, e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
            >
              <option value="">All Modules</option>
              {Object.entries(moduleLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Action Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Action</label>
            <select
              value={filterAction}
              onChange={(e) => handleFilterChange(setFilterAction, e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 outline-none"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="dispatched">Dispatched</option>
              <option value="received">Received</option>
            </select>
          </div>

          {/* Date range filters */}
          <div className="flex gap-2 items-center sm:col-span-2 md:col-span-1">
            <div className="w-full">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Since</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleFilterChange(setStartDate, e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table view */}
      {isLoading ? (
        <div className="py-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
        </div>
      ) : logs.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-800">
              <thead className="bg-slate-950 text-slate-400 font-bold">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Module</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Target Ref</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log._id;
                  const hasDiff = log.metadata && (log.metadata.before || log.metadata.after);
                  
                  return (
                    <React.Fragment key={log._id}>
                      <tr 
                        className={`hover:bg-slate-850/40 transition-colors ${
                          isExpanded ? 'bg-slate-850/30' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-450 font-mono text-[10px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-200">{log.actorName}</div>
                          <div className="text-[10px] text-slate-500 uppercase">{log.actorRole}</div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'created' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            log.action === 'deleted' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            log.action === 'updated' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                            'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-2">
                            ({moduleLabels[log.module] || log.module})
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium max-w-xs sm:max-w-md truncate">
                          {log.description}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {log.entityRef ? (
                            <span className="font-mono text-[10px] bg-slate-950 px-2 py-0.5 border border-slate-800 rounded text-teal-400">
                              {log.entityRef}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono text-[10px]">N/A</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          {hasDiff ? (
                            <button
                              onClick={() => toggleExpand(log._id)}
                              className="text-xs text-teal-400 hover:text-teal-350 font-semibold"
                            >
                              {isExpanded ? 'Hide Changes' : 'Inspect Diffs'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-550">No Diff</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable diff comparison */}
                      {isExpanded && hasDiff && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="border border-slate-850 rounded-xl overflow-hidden">
                              <div className="bg-slate-950 px-4 py-2 border-b border-slate-850 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Modified Field Inspector
                              </div>
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/35">
                                {/* Before State */}
                                <div>
                                  <div className="text-[10px] font-bold text-rose-450 uppercase mb-2 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    Previous Values (Before)
                                  </div>
                                  <pre className="p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-slate-400 border border-slate-850 overflow-x-auto max-h-48">
                                    {JSON.stringify(log.metadata.before || {}, null, 2)}
                                  </pre>
                                </div>

                                {/* After State */}
                                <div>
                                  <div className="text-[10px] font-bold text-teal-450 uppercase mb-2 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                    Updated Values (After)
                                  </div>
                                  <pre className="p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-slate-300 border border-slate-850 overflow-x-auto max-h-48">
                                    {JSON.stringify(log.metadata.after || {}, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-slate-950 border-t border-slate-850 px-5 py-3 text-xs">
              <span className="text-slate-450">
                Showing page <strong className="text-slate-200">{currentPage}</strong> of <strong className="text-slate-200">{totalPages}</strong> ({totalLogs} operations)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-250 disabled:opacity-30 disabled:hover:text-slate-450"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-250 disabled:opacity-30 disabled:hover:text-slate-450"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-24 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-sm text-slate-450">No activity logs found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
