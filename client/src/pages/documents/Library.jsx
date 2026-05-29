import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, Grid, List, Search, SlidersHorizontal, Download,
  Trash2, X, RefreshCw, Loader
} from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';
import DocumentCard from '../../components/documents/DocumentCard';
import DocumentTable from '../../components/documents/DocumentTable';
import FilterSidebar from '../../components/documents/FilterSidebar';
import { CATEGORY_LABELS } from '../../components/documents/DocumentCard';

const Library = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ category: '', isExpired: '', isConfidential: '' });
  const [sort, setSort] = useState('uploadedAt:desc');

  const { documents, pagination, loading, fetchDocuments, updateParams, deleteDocument, downloadDocument } = useDocuments();

  useEffect(() => {
    const p = updateParams({ search: searchInput, ...filters, sort, page: 1 });
    fetchDocuments(p);
  }, [searchInput, filters, sort]);

  const goToPage = (page) => {
    const p = updateParams({ page });
    fetchDocuments(p);
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (allSelected) => {
    setSelectedIds(allSelected ? [] : documents.map(d => d._id));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    const ok = await deleteDocument(id);
    if (ok) {
      const p = updateParams({});
      fetchDocuments(p);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} document(s)?`)) return;
    for (const id of selectedIds) await deleteDocument(id);
    setSelectedIds([]);
    const p = updateParams({});
    fetchDocuments(p);
  };

  const hasActiveFilters = filters.category || filters.isExpired || filters.isConfidential;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Document Library</h1>
          <p className="text-slate-400 text-sm mt-0.5">{pagination.total} document{pagination.total !== 1 ? 's' : ''} found</p>
        </div>
        <Link to="/documents/upload"
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-teal-900/30">
          <Upload size={15} /> Upload
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors"
          />
        </div>

        {/* Sort */}
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-300 outline-none focus:border-teal-500 transition-colors">
          <option value="uploadedAt:desc">Newest First</option>
          <option value="uploadedAt:asc">Oldest First</option>
          <option value="name:asc">Name A–Z</option>
          <option value="name:desc">Name Z–A</option>
          <option value="sizeBytes:desc">Largest First</option>
          <option value="expiryDate:asc">Expiry (Soonest)</option>
        </select>

        {/* Filter toggle */}
        <button onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors
            ${(showFilters || hasActiveFilters) ? 'border-teal-500 text-teal-400 bg-teal-500/10' : 'border-slate-700 text-slate-400 hover:border-teal-500/50'}`}>
          <SlidersHorizontal size={14} />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-teal-400" />}
        </button>

        {/* View toggle */}
        <div className="flex rounded-xl border border-slate-700 overflow-hidden">
          <button onClick={() => setViewMode('grid')}
            className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Grid size={15} />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <List size={15} />
          </button>
        </div>

        <button onClick={() => { const p = updateParams({}); fetchDocuments(p); }}
          className="p-2.5 rounded-xl border border-slate-700 text-slate-500 hover:text-teal-400 transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-sm">
          <span className="text-teal-400 font-semibold">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors">
              <Trash2 size={12} /> Delete Selected
            </button>
            <button onClick={() => setSelectedIds([])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs font-medium transition-colors">
              <X size={12} /> Deselect
            </button>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex gap-5">
        {/* Filter sidebar */}
        {showFilters && (
          <FilterSidebar
            filters={filters}
            onChange={(f) => setFilters(f)}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Documents */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-teal-400">
              <Loader size={32} className="animate-spin" />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map(doc => (
                <DocumentCard
                  key={doc._id}
                  doc={doc}
                  selected={selectedIds.includes(doc._id)}
                  onSelect={handleSelect}
                  onDownload={downloadDocument}
                  onDelete={handleDelete}
                />
              ))}
              {documents.length === 0 && (
                <div className="col-span-full text-center py-20 text-slate-500">
                  <p className="text-lg font-medium">No documents found</p>
                  <p className="text-sm mt-1">Adjust your filters or upload a new document</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <DocumentTable
                documents={documents}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                onDownload={downloadDocument}
                onDelete={handleDelete}
              />
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm disabled:opacity-40 hover:border-teal-500/50 transition-colors">
                ← Prev
              </button>
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button disabled={pagination.page >= pagination.pages}
                onClick={() => goToPage(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm disabled:opacity-40 hover:border-teal-500/50 transition-colors">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Library;
