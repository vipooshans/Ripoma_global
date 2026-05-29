import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocuments } from '../../hooks/useDocuments';
import DocumentCard from '../../components/documents/DocumentCard';
import DocumentTable from '../../components/documents/DocumentTable';
import { FileText, Grid, List, Search, Loader } from 'lucide-react';

/**
 * InvoicesView — Shows only invoice-category documents.
 * Combines commercial_invoice and proforma_invoice categories.
 */
const InvoicesView = () => {
  const [viewMode, setViewMode] = useState('list');
  const [searchInput, setSearchInput] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [invoiceType, setInvoiceType] = useState('');

  const { documents, pagination, loading, fetchDocuments, updateParams, downloadDocument, deleteDocument } = useDocuments({
    category: 'commercial_invoice'
  });

  useEffect(() => {
    const cat = invoiceType || 'commercial_invoice';
    const p = updateParams({ search: searchInput, category: cat, page: 1 });
    fetchDocuments(p);
  }, [searchInput, invoiceType]);

  const handleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (allSelected) => {
    setSelectedIds(allSelected ? [] : documents.map(d => d._id));
  };

  const goToPage = (page) => {
    const p = updateParams({ page });
    fetchDocuments(p);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Invoice Documents</h1>
          <p className="text-slate-400 text-sm mt-0.5">Commercial invoices, proforma invoices & related documents</p>
        </div>
        <Link to="/documents/upload"
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-colors">
          + Upload Invoice
        </Link>
      </div>

      {/* Sub-filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search invoices..."
            className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors" />
        </div>

        <div className="flex rounded-xl border border-slate-700 overflow-hidden">
          {[
            { value: 'commercial_invoice', label: 'Commercial' },
            { value: 'proforma_invoice', label: 'Proforma' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setInvoiceType(opt.value)}
              className={`px-3 py-2 text-sm transition-colors
                ${invoiceType === opt.value ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-xl border border-slate-700 overflow-hidden ml-auto">
          <button onClick={() => setViewMode('grid')}
            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Grid size={15} />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <List size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-teal-400"><Loader size={28} className="animate-spin" /></div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map(doc => (
            <DocumentCard key={doc._id} doc={doc} selected={selectedIds.includes(doc._id)}
              onSelect={handleSelect} onDownload={downloadDocument} onDelete={() => {}} />
          ))}
          {documents.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-500">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No invoice documents found</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <DocumentTable documents={documents} selectedIds={selectedIds}
            onSelect={handleSelect} onSelectAll={handleSelectAll}
            onDownload={downloadDocument} onDelete={() => {}} />
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={pagination.page <= 1} onClick={() => goToPage(pagination.page - 1)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm disabled:opacity-40 hover:border-teal-500/50 transition-colors">
            ← Prev
          </button>
          <span className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages}</span>
          <button disabled={pagination.page >= pagination.pages} onClick={() => goToPage(pagination.page + 1)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm disabled:opacity-40 hover:border-teal-500/50 transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default InvoicesView;
