import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  TrendingUp, 
  Globe, 
  DollarSign, 
  Star, 
  Clock, 
  Download, 
  Play,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import KpiScorecardGrid from '../../components/reports/KpiScorecardGrid';
import { 
  useReportsDashboard, 
  useReportDefinitions, 
  useScheduledReports, 
  useReportExports, 
  useDownloadReportExport
} from '../../hooks/useReports';
import toast from 'react-hot-toast';

const Dashboard = () => {
  // Load dashboard aggregates
  const { data: kpis, isLoading: kpisLoading } = useReportsDashboard();
  
  // Load favourites (definitions with isFavourite = true)
  const { data: definitions, isLoading: defsLoading } = useReportDefinitions();
  const favouriteReports = (definitions || []).filter(d => d.isFavourite);

  // Load next scheduled runs (first 3)
  const { data: schedules, isLoading: schedLoading } = useScheduledReports();
  const upcomingSchedules = (schedules || [])
    .filter(s => s.isActive && s.nextRunAt)
    .sort((a, b) => new Date(a.nextRunAt) - new Date(b.nextRunAt))
    .slice(0, 3);

  // Load recent 5 exports
  const { data: exports, isLoading: exportsLoading, refetch: refetchExports } = useReportExports({ limit: 5 });
  const recentExports = (exports || []).slice(0, 5);

  const downloadMutation = useDownloadReportExport();

  const handleDownload = async (id) => {
    try {
      const { url } = await downloadMutation.mutateAsync(id);
      window.open(url, '_blank');
      toast.success('Download triggered successfully.');
      refetchExports();
    } catch (err) {
      toast.error('Failed to retrieve download link.');
    }
  };

  const getFormatBadge = (format) => {
    switch (format) {
      case 'xlsx':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">XLSX</span>;
      case 'pdf':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-100">PDF</span>;
      case 'csv':
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-50 text-slate-650 border border-slate-200">CSV</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Intelligence & Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Operational dashboards, cross-module KPI metrics, saved builders, and automated scheduled emails.
          </p>
        </div>
        <div>
          <Link
            to="/reports/builder"
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10 font-bold"
          >
            <span>Create Custom Report</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* KPI scorecard Row */}
      <KpiScorecardGrid kpiData={kpis} isLoading={kpisLoading} />

      {/* Report shortcuts */}
      <div className="space-y-2.5">
        <h3 className="font-extrabold text-slate-800 text-sm">Standard Pre-built Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Sales Report card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between h-44 group">
            <div>
              <div className="p-2 bg-teal-50 text-teal-650 border border-teal-100 rounded-lg w-fit group-hover:scale-105 transition-transform">
                <TrendingUp size={16} />
              </div>
              <h4 className="font-extrabold text-slate-805 text-xs mt-3.5">Sales & Revenue Report</h4>
              <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Analyze export invoices, product margins, and customer order values.</p>
            </div>
            <Link to="/reports/sales" className="text-[10px] font-bold text-teal-650 hover:underline flex items-center gap-0.5 mt-4 self-end">
              <span>Analyze Sales</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Shipment Report card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-navy-300 transition-all flex flex-col justify-between h-44 group">
            <div>
              <div className="p-2 bg-slate-50 text-navy-600 border border-slate-200 rounded-lg w-fit group-hover:scale-105 transition-transform">
                <Globe size={16} />
              </div>
              <h4 className="font-extrabold text-slate-805 text-xs mt-3.5">Logistics & Shipments</h4>
              <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Assess carrier on-time rates, transit delays, and cargo routes volume.</p>
            </div>
            <Link to="/reports/shipments" className="text-[10px] font-bold text-teal-650 hover:underline flex items-center gap-0.5 mt-4 self-end">
              <span>View Logistics</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Financial Report card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between h-44 group">
            <div>
              <div className="p-2 bg-teal-50 text-teal-650 border border-teal-100 rounded-lg w-fit group-hover:scale-105 transition-transform">
                <DollarSign size={16} />
              </div>
              <h4 className="font-extrabold text-slate-805 text-xs mt-3.5">Financial Ageing Report</h4>
              <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Monitor customer receivables ageing, supplier payables, and margins.</p>
            </div>
            <Link to="/reports/financial" className="text-[10px] font-bold text-teal-650 hover:underline flex items-center gap-0.5 mt-4 self-end">
              <span>View Financials</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {/* Business Analytics card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between h-44 group">
            <div>
              <div className="p-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg w-fit group-hover:scale-105 transition-transform">
                <ShieldCheck size={16} />
              </div>
              <h4 className="font-extrabold text-slate-805 text-xs mt-3.5">Business Intelligence</h4>
              <p className="text-[10px] text-slate-405 mt-1 leading-relaxed">Analyze acquisition metrics, repeat sales rates, and corridor value dynamics.</p>
            </div>
            <Link to="/reports/business-analytics" className="text-[10px] font-bold text-teal-650 hover:underline flex items-center gap-0.5 mt-4 self-end">
              <span>View BI Analytics</span>
              <ArrowRight size={12} />
            </Link>
          </div>

        </div>
      </div>

      {/* Main Grid: Favourites vs Schedules & Downloads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Favourites List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <span>Starred Custom Templates</span>
            </h3>
            <Link to="/reports/builder" className="text-[10px] font-bold text-teal-650 hover:underline">
              Manage Builder
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden font-sans">
            <div className="divide-y divide-slate-100">
              {defsLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 animate-pulse flex items-center justify-between h-14 bg-slate-50/20" />
                ))
              ) : favouriteReports.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold italic text-xs leading-relaxed">
                  No starred reports. Open the Report Builder, customize filters, and click the star icon to save shortcuts here.
                </div>
              ) : (
                favouriteReports.map(report => (
                  <div key={report._id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-700 truncate">{report.name}</p>
                      <span className="text-[9px] text-slate-450 uppercase font-extrabold tracking-wider block mt-0.5">
                        Type: {report.type} | Last Run: {report.lastRunAt ? new Date(report.lastRunAt).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                    <Link
                      to={`/reports/builder?editId=${report._id}`}
                      className="btn-secondary py-1 px-3 text-[10px] font-bold shrink-0 border-slate-250 bg-white"
                    >
                      Run Template
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Schedules & Downloads */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Schedules Strip */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Clock size={16} className="text-teal-650" />
                <span>Next Scheduled Deliveries</span>
              </h3>
              <Link to="/reports/scheduled" className="text-[10px] font-bold text-teal-650 hover:underline">
                Manage Cron
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden font-sans">
              <div className="divide-y divide-slate-100">
                {schedLoading ? (
                  [...Array(2)].map((_, i) => (
                    <div key={i} className="p-3.5 animate-pulse h-12" />
                  ))
                ) : upcomingSchedules.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 font-semibold italic text-xs leading-relaxed">
                    No active automation schedules configured.
                  </div>
                ) : (
                  upcomingSchedules.map(sched => (
                    <div key={sched._id} className="p-3.5 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                      <div>
                        <span className="font-bold text-slate-700 block text-xs">{sched.name}</span>
                        <span className="text-[9px] text-slate-450 uppercase font-extrabold block mt-0.5">
                          Frequency: <strong className="text-teal-650">{sched.frequency}</strong> | format: {sched.format}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-mono font-bold text-slate-600">
                          {new Date(sched.nextRunAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Next Run Time</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Exports Log */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Download size={16} className="text-navy-600" />
                <span>Recent File Exports</span>
              </h3>
              <Link to="/reports/history" className="text-[10px] font-bold text-teal-650 hover:underline">
                All History
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden font-sans">
              <div className="divide-y divide-slate-100">
                {exportsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="p-3.5 animate-pulse h-12" />
                  ))
                ) : recentExports.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-semibold italic text-xs leading-relaxed">
                    No generated files found. Run a report from the builder or analytics modules to generate download sheets.
                  </div>
                ) : (
                  recentExports.map(item => (
                    <div key={item._id} className="p-3.5 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                      <div className="truncate">
                        <span className="font-bold text-slate-700 block text-xs truncate">{item.name}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-450 uppercase font-extrabold">
                          {getFormatBadge(item.format)}
                          <span>Rows: {item.rowCount}</span>
                          <span>Size: {(item.fileSizeBytes / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(item._id)}
                        disabled={item.status !== 'ready'}
                        className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-teal-650 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                        title="Download File"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
