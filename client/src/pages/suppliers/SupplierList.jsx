import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  useSuppliers, useDeleteSupplier, useUpdateSupplierStatus, useImportSuppliersCSV
} from '../../hooks/useSuppliers';
import { useCategories } from '../../hooks/useInventory';
import RatingStarPicker from '../../components/suppliers-customers/RatingStarPicker';
import {
  LayoutGrid, List, Search, Plus, Upload, Download, Trash2, Edit2, Eye,
  X, ChevronLeft, ChevronRight, FileSpreadsheet, FolderOpen
} from 'lucide-react';
import api from '../../services/api';

const STATUS_COLORS = {
  active: 'bg-teal-50 text-teal-700 border-teal-200',
  inactive: 'bg-amber-50 text-amber-700 border-amber-200',
  blacklisted: 'bg-rose-50 text-rose-700 border-rose-200'
};

const TYPE_LABELS = {
  manufacturer: 'Manufacturer', distributor: 'Distributor',
  trader: 'Trader', agent: 'Agent', other: 'Other'
};

const SupplierList = () => {
  const [view, setView] = useState(() => localStorage.getItem('ripoma_sup_view') || 'table');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);

  useEffect(() => { localStorage.setItem('ripoma_sup_view', view); }, [view]);
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, sort]);

  const { data, isLoading, refetch } = useSuppliers({ page, limit: 12, search, type: typeFilter, status: statusFilter, sort });
  const deleteMut = useDeleteSupplier();
  const statusMut = useUpdateSupplierStatus();
  const importMut = useImportSuppliersCSV();

  const suppliers = data?.suppliers || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this supplier?')) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Supplier archived.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to archive supplier.');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length || !window.confirm(`Archive ${selectedIds.length} suppliers?`)) return;
    let successCount = 0;
    let failCount = 0;
    let lastError = '';
    for (const id of selectedIds) {
      try {
        await api.delete(`/suppliers/${id}`);
        successCount++;
      } catch (err) {
        failCount++;
        lastError = err.response?.data?.message || lastError;
      }
    }
    refetch();
    setSelectedIds([]);
    if (failCount > 0) {
      toast.error(
        lastError
          ? `${successCount} archived, ${failCount} failed. ${lastError}`
          : `${successCount} archived, ${failCount} failed.`
      );
    } else {
      toast.success('Bulk archive complete.');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => setImportFile(files[0]),
    accept: { 'text/csv': ['.csv'] }, multiple: false
  });

  const handleImport = async () => {
    if (!importFile) return;
    const fd = new FormData(); fd.append('file', importFile);
    try {
      const res = await importMut.mutateAsync(fd);
      toast.success(res.message); setImportModal(false); setImportFile(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Import failed.'); }
  };

  const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Supplier Directory</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage manufacturers, distributors, and trading partners.</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button onClick={() => setImportModal(true)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 px-3.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5">
            <Upload size={13} /> Import CSV
          </button>
          <a href="http://localhost:5000/api/suppliers/export" download className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 px-3.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5">
            <Download size={13} /> Export CSV
          </a>
          <Link to="/suppliers/add" className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
            <Plus size={13} /> Add Supplier
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative md:w-72 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input type="text" className="form-input pl-9" placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className="form-select text-xs py-2" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="form-select text-xs py-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
          <select className="form-select text-xs py-2" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="createdAt:desc">Newest</option>
            <option value="createdAt:asc">Oldest</option>
            <option value="companyName:asc">Name A-Z</option>
            <option value="companyName:desc">Name Z-A</option>
            <option value="rating:desc">Highest Rating</option>
          </select>
          <div className="border border-slate-200 rounded-lg p-0.5 flex bg-slate-50 gap-0.5 ml-auto md:ml-0">
            <button onClick={() => setView('table')} className={`p-1.5 rounded ${view === 'table' ? 'bg-white text-teal-650 shadow-sm' : 'text-slate-400'}`}><List size={14} /></button>
            <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view === 'grid' ? 'bg-white text-teal-650 shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={14} /></button>
          </div>
        </div>
      </div>

      {/* Bulk bar */}
      {selectedIds.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
          <span className="text-xs font-bold text-teal-800">{selectedIds.length} selected</span>
          <div className="flex gap-2">
            <button onClick={handleBulkDelete} className="bg-rose-50 border border-rose-200 text-rose-700 py-1.5 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1">
              <Trash2 size={11} /> Delete Selected
            </button>
            <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-slate-600 p-1"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl" />)}</div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <FolderOpen size={40} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-700 text-sm">No suppliers found</h3>
          <p className="text-slate-400 text-xs mt-1">Try adjusting filters or add a new supplier.</p>
        </div>
      ) : view === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-10"><input type="checkbox" className="form-checkbox" checked={selectedIds.length === suppliers.length && suppliers.length > 0} onChange={e => setSelectedIds(e.target.checked ? suppliers.map(s => s._id) : [])} /></th>
                  <th className="py-3 px-3">Company</th>
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Country</th>
                  <th className="py-3 px-3">Primary Contact</th>
                  <th className="py-3 px-3">Rating</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {suppliers.map(s => {
                  const primary = s.contacts?.find(c => c.isPrimary) || s.contacts?.[0];
                  return (
                    <tr key={s._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4"><input type="checkbox" className="form-checkbox" checked={selectedIds.includes(s._id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, s._id] : prev.filter(id => id !== s._id))} /></td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-500/10 border border-teal-200 flex items-center justify-center text-teal-700 font-extrabold text-[10px] shrink-0">{initials(s.companyName)}</div>
                          <span className="font-bold text-slate-800 truncate max-w-[160px]">{s.companyName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[10px] font-bold text-slate-500">{s.code}</td>
                      <td className="py-3.5 px-3"><span className="border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200">{s.type}</span></td>
                      <td className="py-3.5 px-3 text-slate-500 font-semibold">{s.country || '—'}</td>
                      <td className="py-3.5 px-3">
                        {primary ? (
                          <div className="leading-tight">
                            <span className="font-bold text-slate-700 block text-[11px]">{primary.name}</span>
                            <span className="text-[9px] text-slate-400">{primary.email}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-3.5 px-3"><RatingStarPicker value={s.rating || 0} readOnly /></td>
                      <td className="py-3.5 px-3">
                        <span className={`border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[s.status] || ''}`}>{s.status}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <Link to={`/suppliers/${s._id}`} className="p-1.5 text-slate-400 hover:text-teal-650 hover:bg-teal-50 rounded"><Eye size={13} /></Link>
                          <Link to={`/suppliers/${s._id}/edit`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={13} /></Link>
                          <button onClick={() => handleDelete(s._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {suppliers.map(s => (
            <div key={s._id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative">
              <input type="checkbox" className="form-checkbox absolute top-3.5 left-3.5" checked={selectedIds.includes(s._id)} onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, s._id] : prev.filter(id => id !== s._id))} />
              <div className="flex flex-col items-center text-center space-y-2 pt-2">
                <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-200 flex items-center justify-center text-teal-700 font-extrabold text-sm">{initials(s.companyName)}</div>
                <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">{s.code}</span>
                <h4 className="font-extrabold text-slate-800 text-xs leading-tight">{s.companyName}</h4>
                <span className="text-slate-400 text-[10px]">{s.country || '—'}</span>
                <span className={`border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[s.status] || ''}`}>{s.status}</span>
                <RatingStarPicker value={s.rating || 0} readOnly />
              </div>
              <div className="flex justify-center gap-1 mt-3 pt-3 border-t border-slate-100">
                <Link to={`/suppliers/${s._id}`} className="p-1.5 text-slate-400 hover:text-teal-650 hover:bg-teal-50 rounded"><Eye size={13} /></Link>
                <Link to={`/suppliers/${s._id}/edit`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={13} /></Link>
                <button onClick={() => handleDelete(s._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs font-bold text-slate-600">
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={13} /></button>
            <button disabled={page === pagination.totalPages} onClick={() => setPage(p => p + 1)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={13} /></button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2"><FileSpreadsheet className="text-teal-650" size={15} /> Import Suppliers CSV</h3>
              <button onClick={() => { setImportModal(false); setImportFile(null); }}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">Required columns: <code className="bg-slate-100 px-1 rounded">companyName, type, country, currency, paymentTerms</code></p>
              <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-teal-400 bg-teal-50/20' : importFile ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-400'}`}>
                <input {...getInputProps()} />
                {importFile ? (
                  <div className="text-center">
                    <FileSpreadsheet className="text-emerald-500 mx-auto mb-2" size={28} />
                    <p className="text-xs font-bold text-slate-700">{importFile.name}</p>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 text-xs">
                    <Upload className="mx-auto text-slate-300 mb-1" size={28} />
                    <p className="font-bold text-slate-500 mt-1">Drag & drop CSV or click to select</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => { setImportModal(false); setImportFile(null); }} className="bg-white border border-slate-200 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold">Cancel</button>
              <button onClick={handleImport} disabled={!importFile || importMut.isPending} className="btn-primary text-xs py-2 px-4 disabled:opacity-40">
                {importMut.isPending ? 'Importing...' : 'Upload & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierList;
