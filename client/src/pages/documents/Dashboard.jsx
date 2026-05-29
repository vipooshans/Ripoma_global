import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Upload, AlertTriangle, Clock, HardDrive,
  Download, Eye, TrendingUp, ArrowRight, Loader
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useDocumentDashboard } from '../../hooks/useDocuments';
import StorageProgressBar from '../../components/documents/StorageProgressBar';
import FileTypeIcon from '../../components/documents/FileTypeIcon';
import { CATEGORY_LABELS, formatBytes } from '../../components/documents/DocumentCard';

const KPICard = ({ icon: Icon, label, value, sub, color = 'teal', to }) => {
  const colors = {
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  const content = (
    <div className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-5 flex items-start gap-4 transition-all duration-200 group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100 leading-tight">{value ?? '—'}</p>
        <p className="text-sm text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
      </div>
      {to && <ArrowRight size={16} className="ml-auto text-slate-600 group-hover:text-teal-400 transition-colors self-center" />}
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
};

const CHART_COLORS = ['#0D9488','#14B8A6','#2DD4BF','#5EEAD4','#99F6E4','#CCFBF1',
  '#0891B2','#06B6D4','#22D3EE','#7C3AED','#8B5CF6','#A78BFA'];

const Dashboard = () => {
  const { data, loading, error, fetchDashboard } = useDocumentDashboard();

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-teal-400">
        <Loader size={32} className="animate-spin" />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const categoryBreakdown = data?.categoryBreakdown || [];
  const uploadTrend = data?.uploadTrend || [];
  const recentUploads = data?.recentUploads || [];
  const expiringDocsList = data?.expiringDocsList || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Document Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Centralised repository for all RIPOMA documents</p>
        </div>
        <Link to="/documents/upload"
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-teal-900/30">
          <Upload size={16} /> Upload Document
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={FileText} label="Total Documents" value={kpis.totalDocuments?.toLocaleString()} color="teal" to="/documents/library" />
        <KPICard icon={HardDrive} label="Storage Used" value={formatBytes(kpis.totalStorageBytes)} color="blue" />
        <KPICard icon={AlertTriangle} label="Expired Documents" value={kpis.expiredDocuments} color="red" to="/documents/library?isExpired=true" />
        <KPICard icon={Clock} label="Expiring in 30 Days" value={kpis.expiringIn30Days} color="amber" to="/documents/library" />
      </div>

      {/* Storage bar */}
      <StorageProgressBar usedBytes={kpis.totalStorageBytes} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload trend */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-teal-400" />
            <h3 className="font-semibold text-slate-300 text-sm">Upload Activity (Last 30 Days)</h3>
          </div>
          {uploadTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={uploadTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={v => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#0D9488' }}
                  labelFormatter={v => new Date(v).toLocaleDateString()}
                />
                <Bar dataKey="count" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-600 text-sm">No upload data for this period</div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-teal-400" />
            <h3 className="font-semibold text-slate-300 text-sm">Documents by Category</h3>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {categoryBreakdown.length === 0 && (
              <p className="text-slate-600 text-sm text-center py-8">No documents yet</p>
            )}
            {categoryBreakdown.map((cat, idx) => {
              const maxCount = categoryBreakdown[0]?.count || 1;
              const pct = (cat.count / maxCount) * 100;
              return (
                <div key={cat._id}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{CATEGORY_LABELS[cat._id] || cat._id}</span>
                    <span className="text-slate-300 font-medium">{cat.count}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Uploads */}
        <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
              <Upload size={14} className="text-teal-400" /> Recent Uploads
            </h3>
            <Link to="/documents/library" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all</Link>
          </div>
          <div className="space-y-3">
            {recentUploads.length === 0 && <p className="text-slate-600 text-sm">No recent uploads</p>}
            {recentUploads.map(doc => (
              <Link to={`/documents/${doc._id}`} key={doc._id}
                className="flex items-center gap-3 hover:bg-slate-700/50 rounded-lg p-1.5 -mx-1.5 transition-colors">
                <FileTypeIcon extension={doc.extension} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(doc.sizeBytes)} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
              <Clock size={14} className="text-amber-400" /> Expiring Soon
            </h3>
          </div>
          <div className="space-y-3">
            {expiringDocsList.length === 0 && <p className="text-slate-600 text-sm">No documents expiring soon</p>}
            {expiringDocsList.map(doc => {
              const daysLeft = Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <Link to={`/documents/${doc._id}`} key={doc._id}
                  className="flex items-center gap-3 hover:bg-slate-700/50 rounded-lg p-1.5 -mx-1.5 transition-colors">
                  <FileTypeIcon extension={doc.extension} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 font-medium truncate">{doc.name}</p>
                    <p className={`text-xs font-medium ${daysLeft <= 7 ? 'text-red-400' : 'text-amber-400'}`}>
                      Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-300 text-sm flex items-center gap-2">
              <Eye size={14} className="text-teal-400" /> Recent Activity
            </h3>
            <Link to="/documents/activity" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all</Link>
          </div>
          <div className="space-y-2">
            {recentActivity.length === 0 && <p className="text-slate-600 text-sm">No recent activity</p>}
            {recentActivity.map((act, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-400">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-slate-300">{act.performedBy?.firstName} {act.performedBy?.lastName}</span>
                  {' '}<span className="text-teal-400 font-medium">{act.action?.replace(/_/g, ' ')}</span>
                  {act.document && <span> · {act.document.name}</span>}
                  <div className="text-slate-600 mt-0.5">{new Date(act.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
