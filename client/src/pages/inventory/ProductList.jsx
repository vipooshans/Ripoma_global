import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  useProducts,
  useCategories,
  useDeleteProduct,
  useUpdateProductStatus,
  useImportProductsCSV
} from '../../hooks/useInventory';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Trash2,
  Edit2,
  Eye,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FolderOpen,
  X,
  FileSpreadsheet
} from 'lucide-react';
import api from '../../services/api';

const ProductList = () => {
  const navigate = useNavigate();

  // Component UI States
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('ripoma_product_view_mode') || 'table');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);

  // Queries & Mutations
  const { data: categories } = useCategories();
  const { data: productsData, isLoading, refetch } = useProducts({
    page,
    limit: 10,
    search,
    category: categoryFilter,
    status: statusFilter,
    sort
  });

  const deleteProductMutation = useDeleteProduct();
  const statusMutation = useUpdateProductStatus();
  const importCSVMutation = useImportProductsCSV();

  useEffect(() => {
    localStorage.setItem('ripoma_product_view_mode', viewMode);
  }, [viewMode]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter, sort]);

  const products = productsData?.products || [];
  const pagination = productsData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(products.map((p) => p._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProductMutation.mutateAsync(id);
        toast.success('Product deleted successfully.');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete product.');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected products?`)) {
      try {
        let successCount = 0;
        let failCount = 0;

        for (const id of selectedIds) {
          try {
            await api.delete(`/products/${id}`);
            successCount++;
          } catch (e) {
            failCount++;
          }
        }

        refetch();
        setSelectedIds([]);
        toast.success(`Bulk delete finished. ${successCount} deleted, ${failCount} failed.`);
      } catch (err) {
        toast.error('Bulk action failed.');
      }
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedIds.length === 0 || !newStatus) return;
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        await api.patch(`/products/${id}/status`, { status: newStatus });
        successCount++;
      }
      refetch();
      setSelectedIds([]);
      toast.success(`Bulk status updated: ${successCount} items set to ${newStatus}.`);
    } catch (err) {
      toast.error('Bulk action failed.');
    }
  };

  const handleBulkExport = async () => {
    if (selectedIds.length === 0) return;
    try {
      // Fetch details of selected products or request special export
      const { data } = await api.get('/products/export');
      // Simple filter for selected ones if needed, or download full list
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'selected_products.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Export failed.');
    }
  };

  // CSV Template download
  const handleDownloadTemplate = () => {
    const headers = ['sku', 'name', 'category', 'unit', 'unitCost', 'sellingPrice', 'supplier', 'lowStockThreshold', 'reorderQuantity'];
    const sampleRow = ['SOL-PAN-350W', 'Solar Panel 350W', 'Clean Energy', 'pcs', '120.00', '180.00', 'SunSupply Inc', '15', '50'];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), sampleRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'products_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template downloaded.');
  };

  // CSV Drag and drop config
  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setImportFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false
  });

  const handleImportSubmit = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await importCSVMutation.mutateAsync(formData);
      toast.success(res.message || 'CSV Import complete.');
      setIsImportModalOpen(false);
      setImportFile(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed.');
    }
  };

  // Stock indicator color math
  const getStockIndicatorColor = (stock, threshold) => {
    if (stock <= threshold) return 'text-rose-600 bg-rose-50 border-rose-100'; // red
    if (stock <= threshold + 20) return 'text-amber-600 bg-amber-50 border-amber-100'; // amber
    return 'text-teal-600 bg-teal-50 border-teal-100'; // green
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Product Directory</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage your global export/import product inventory, pricing formulas, and physical sizes.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Upload size={14} />
            <span>Import CSV</span>
          </button>
          <a
            href="http://localhost:5000/api/products/export"
            download
            className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-3.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
          <Link
            to="/inventory/products/add"
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-teal-500/10"
          >
            <ChevronRight size={14} className="rotate-90" />
            <span>Create Product</span>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative md:w-80 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            className="form-input pl-9"
            placeholder="Search by SKU or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          <select
            className="form-select text-xs py-2"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories?.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            className="form-select text-xs py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>

          {/* Sort */}
          <select
            className="form-select text-xs py-2"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="createdAt:desc">Newest Added</option>
            <option value="createdAt:asc">Oldest Added</option>
            <option value="name:asc">Name (A-Z)</option>
            <option value="name:desc">Name (Z-A)</option>
            <option value="sellingPrice:asc">Price (Low to High)</option>
            <option value="sellingPrice:desc">Price (High to Low)</option>
          </select>

          {/* View Mode Toggle */}
          <div className="border border-slate-200 rounded-lg p-0.5 flex bg-slate-50 gap-0.5 shrink-0 ml-auto md:ml-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white text-teal-650 shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
              title="Table View"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white text-teal-650 shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
              title="Card View"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-teal-50 border border-teal-150 rounded-xl p-3 flex items-center justify-between shadow-sm animate-fade-in">
          <span className="text-xs font-bold text-teal-850">
            {selectedIds.length} products selected
          </span>
          <div className="flex items-center gap-2">
            <select
              className="form-select py-1 px-2.5 text-[11px] font-bold bg-white"
              onChange={(e) => handleBulkStatusChange(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Change Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
            <button
              onClick={handleBulkExport}
              className="bg-white border border-teal-200 text-teal-700 hover:bg-teal-100 py-1.5 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1"
            >
              <Download size={12} /> Export Selected
            </button>
            <button
              onClick={handleBulkDelete}
              className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 py-1.5 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1"
            >
              <Trash2 size={12} /> Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Products Display */}
      {isLoading ? (
        <div className="space-y-4 py-8">
          {[...Array(viewMode === 'table' ? 4 : 3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <FolderOpen size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-800 text-sm">No products found</h3>
          <p className="text-slate-450 text-xs mt-1">Try clearing filters or create a new catalog item.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={products.length > 0 && selectedIds.length === products.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-3">Image</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3 text-right font-semibold">Stock level</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {products.map((p) => {
                  const stockColor = getStockIndicatorColor(p.totalStock, p.lowStockThreshold);
                  const statusColors =
                    p.status === 'active'
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : p.status === 'inactive'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200';

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={selectedIds.includes(p._id)}
                          onChange={(e) => handleSelectOne(p._id, e.target.checked)}
                        />
                      </td>
                      <td className="py-3.5 px-3">
                        {p.images && p.images[0] ? (
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-8 h-8 rounded border border-slate-200 object-cover bg-slate-50"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-[9px] uppercase">
                            No image
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-800">{p.sku}</td>
                      <td className="py-3.5 px-3 font-semibold">{p.name}</td>
                      <td className="py-3.5 px-3 text-slate-500 font-semibold">{p.category?.name || '—'}</td>
                      <td className="py-3.5 px-3 text-slate-400 uppercase font-bold text-[9px]">{p.unit}</td>
                      <td className="py-3.5 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${stockColor}`}>
                          {p.totalStock?.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${statusColors}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/inventory/products/${p._id}`}
                            className="p-1.5 text-slate-400 hover:text-teal-650 hover:bg-teal-50 rounded transition-colors"
                            title="View Detail"
                          >
                            <Eye size={14} />
                          </Link>
                          <Link
                            to={`/inventory/products/${p._id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </Link>
                          <button
                            onClick={() => handleDelete(p._id)}
                            disabled={p.status === 'active'}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                            title={
                              p.status === 'active'
                                ? 'Deactivate or discontinue before deleting'
                                : 'Delete'
                            }
                          >
                            <Trash2 size={14} />
                          </button>
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
        /* Grid/Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => {
            const stockColor = getStockIndicatorColor(p.totalStock, p.lowStockThreshold);
            const statusColors =
              p.status === 'active'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : p.status === 'inactive'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200';

            return (
              <div
                key={p._id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow relative"
              >
                {/* Checkbox badge */}
                <input
                  type="checkbox"
                  className="form-checkbox absolute top-3.5 left-3.5 z-10"
                  checked={selectedIds.includes(p._id)}
                  onChange={(e) => handleSelectOne(p._id, e.target.checked)}
                />

                {/* Card image */}
                <div className="h-40 bg-slate-50 border-b border-slate-150 flex items-center justify-center overflow-hidden relative">
                  {p.images && p.images[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileSpreadsheet size={32} className="text-slate-300" />
                  )}
                  <span className={`absolute top-3.5 right-3.5 border px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white ${statusColors}`}>
                    {p.status}
                  </span>
                </div>

                {/* Card body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase border border-slate-150 tracking-wider">
                      {p.sku}
                    </span>
                    <h4 className="font-extrabold text-slate-800 text-xs mt-2 truncate leading-tight">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">{p.category?.name || 'Uncategorized'}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Stock on hand</span>
                      <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] inline-block mt-0.5 ${stockColor}`}>
                        {p.totalStock?.toLocaleString()} {p.unit}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <Link
                        to={`/inventory/products/${p._id}`}
                        className="p-1.5 text-slate-400 hover:text-teal-650 hover:bg-teal-50 rounded transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </Link>
                      <Link
                        to={`/inventory/products/${p._id}/edit`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(p._id)}
                        disabled={p.status === 'active'}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                        title={
                          p.status === 'active'
                            ? 'Deactivate or discontinue before deleting'
                            : 'Delete'
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs font-bold text-slate-600">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page === pagination.totalPages}
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <FileSpreadsheet className="text-teal-650" size={16} />
                <span>Import Products Bulk CSV</span>
              </h3>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-550 text-xs leading-normal">
                Upload a structured CSV file matching our inventory schema variables. You can download our baseline template below.
              </p>

              {/* Template Download link */}
              <button
                onClick={handleDownloadTemplate}
                className="text-xs font-bold text-teal-650 hover:text-teal-800 flex items-center gap-1"
              >
                <Download size={13} /> Download Baseline CSV Template
              </button>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-teal-400 bg-teal-50/20'
                    : importFile
                      ? 'border-emerald-400 bg-emerald-50/20'
                      : 'border-slate-250 hover:border-slate-400'
                }`}
              >
                <input {...getInputProps()} />
                {importFile ? (
                  <div className="text-center space-y-1.5">
                    <FileSpreadsheet className="text-emerald-500 mx-auto" size={28} />
                    <p className="text-xs font-bold text-slate-700">{importFile.name}</p>
                    <span className="text-[10px] text-slate-400 block">
                      {(importFile.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                ) : (
                  <div className="text-center space-y-1 text-slate-400 text-xs">
                    <Upload className="mx-auto text-slate-350" size={28} />
                    <p className="font-bold text-slate-650 mt-1">Drag and drop file here</p>
                    <p className="text-[10px] text-slate-400">or click to select from filesystem</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                }}
                className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!importFile || importCSVMutation.isPending}
                className="btn-primary text-xs py-2 px-4 shadow-teal-500/10 disabled:opacity-40"
              >
                {importCSVMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Upload & Import</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
