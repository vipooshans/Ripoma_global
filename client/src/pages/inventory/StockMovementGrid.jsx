import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  useStockMovements,
  useProducts,
  useWarehouses,
  useCreateStockMovement
} from '../../hooks/useInventory';
import {
  History,
  Filter,
  PlusCircle,
  X,
  ArrowDownUp,
  Building,
  Calendar,
  FileText,
  User,
  Package,
  TrendingDown,
  TrendingUp,
  Tag
} from 'lucide-react';

const StockMovementGrid = () => {
  // Query Filters State
  const [productFilter, setProductFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Form Drawer UI State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    product: '',
    warehouse: '',
    transferTo: '',
    type: 'receive',
    quantity: 1,
    reference: '',
    batchNumber: '',
    expiryDate: '',
    note: ''
  });

  // Queries
  const { data: movements, isLoading: listLoading, refetch } = useStockMovements({
    product: productFilter,
    warehouse: warehouseFilter,
    type: typeFilter,
    dateFrom,
    dateTo
  });

  const { data: productsData } = useProducts({ limit: 100 });
  const { data: warehouses } = useWarehouses();
  const createMovementMutation = useCreateStockMovement();

  const productsList = productsData?.products || [];

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setFormData({
      product: '',
      warehouse: '',
      transferTo: '',
      type: 'receive',
      quantity: 1,
      reference: '',
      batchNumber: '',
      expiryDate: '',
      note: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.product || !formData.warehouse || !formData.type || formData.quantity === '' || formData.quantity === null || formData.quantity === undefined) {
      toast.error('Product, Warehouse, Type, and Quantity are required.');
      return;
    }

    const qtyNum = Number(formData.quantity);
    if (!Number.isInteger(qtyNum)) {
      toast.error('Quantity must be a whole number.');
      return;
    }

    if (formData.type === 'adjustment') {
      if (qtyNum === 0) {
        toast.error('Adjustment quantity must be a non-zero integer.');
        return;
      }
    } else if (qtyNum <= 0) {
      toast.error('Quantity must be a positive integer.');
      return;
    }

    if (formData.type === 'transfer' && !formData.transferTo) {
      toast.error('Destination warehouse is required for transfers.');
      return;
    }

    if (formData.type === 'transfer' && formData.warehouse === formData.transferTo) {
      toast.error('Source and destination warehouses must be different.');
      return;
    }

    const payload = {
      product: formData.product,
      warehouse: formData.warehouse,
      type: formData.type,
      quantity: qtyNum,
      reference: formData.reference,
      note: formData.note,
      batchNumber: formData.batchNumber || undefined,
      expiryDate: formData.expiryDate || undefined
    };

    if (formData.type === 'transfer') {
      payload.transferTo = formData.transferTo;
    }

    try {
      await createMovementMutation.mutateAsync(payload);
      toast.success('Stock movement registered successfully.');
      handleCloseDrawer();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record movement.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Movements Ledger</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Log cargo arrivals, dispatch shipments, inventory audits, and internal depot transfers.
          </p>
        </div>
        <button
          onClick={handleOpenDrawer}
          className="btn-primary flex items-center gap-1.5 text-xs py-2.5 px-4 shadow-teal-500/10 shrink-0"
        >
          <PlusCircle size={15} />
          <span>Record Movement</span>
        </button>
      </div>

      {/* Query Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
          <Filter size={12} />
          <span>Search & Filter Logs</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Product Filter */}
          <div>
            <label className="form-label text-[10px]">Product</label>
            <select
              className="form-select py-1.5 text-xs font-semibold"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            >
              <option value="">All Products</option>
              {productsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Filter */}
          <div>
            <label className="form-label text-[10px]">Depot / Warehouse</label>
            <select
              className="form-select py-1.5 text-xs font-semibold"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="">All Warehouses</option>
              {warehouses?.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type Filter */}
          <div>
            <label className="form-label text-[10px]">Action Type</label>
            <select
              className="form-select py-1.5 text-xs font-semibold"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="receive">Receive Goods</option>
              <option value="issue">Issue Goods</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="adjustment">Stock Adjustment</option>
              <option value="return">Customer Return</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="form-label text-[10px]">Date From</label>
            <input
              type="date"
              className="form-input py-1 text-xs font-semibold"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div>
            <label className="form-label text-[10px]">Date To</label>
            <input
              type="date"
              className="form-input py-1 text-xs font-semibold"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
        {listLoading ? (
          <div className="space-y-3 py-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !movements || movements.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold">
            No stock movements match the specified query filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">SKU & Item Name</th>
                  <th className="py-2.5 px-3">Depot</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Before</th>
                  <th className="py-2.5 px-3 text-right">After</th>
                  <th className="py-2.5 px-3">Reference No</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {movements.map((m) => {
                  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (m.type === 'receive' || m.type === 'transfer_in') badgeClass = 'bg-teal-50 text-teal-700 border-teal-150';
                  if (m.type === 'issue' || m.type === 'transfer_out') badgeClass = 'bg-rose-50 text-rose-700 border-rose-150';
                  if (m.type === 'adjustment') badgeClass = 'bg-amber-50 text-amber-700 border-amber-150';

                  return (
                    <tr key={m._id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`border px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${badgeClass}`}>
                          {m.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="truncate max-w-[180px]">
                          <strong className="text-slate-800 block text-[11px] font-bold leading-none">{m.product?.sku}</strong>
                          <span className="text-[10px] text-slate-400 leading-none mt-0.5 block">{m.product?.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600">{m.warehouse?.code}</td>
                      <td className={`py-3 px-3 text-right font-extrabold whitespace-nowrap ${m.quantity > 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 font-semibold">{m.quantityBefore ?? '—'}</td>
                      <td className="py-3 px-3 text-right text-slate-800 font-bold">{m.quantityAfter ?? '—'}</td>
                      <td className="py-3 px-3 font-semibold text-slate-500 whitespace-nowrap">{m.reference || '—'}</td>
                      <td className="py-3 px-3 text-slate-500 text-[10px] whitespace-nowrap">{m.performedBy?.name || 'System'}</td>
                      <td className="py-3 px-3 text-slate-450 truncate max-w-[120px]" title={m.note}>{m.note || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Stock Movement Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex justify-end backdrop-blur-xs">
          <div className="bg-white border-l border-slate-200 shadow-2xl w-full max-w-md h-full flex flex-col justify-between animate-slide-in">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <ArrowDownUp className="text-teal-650" size={16} />
                <span>Record Stock Movement</span>
              </h3>
              <button onClick={handleCloseDrawer} className="text-slate-400 hover:text-slate-650">
                <X size={18} />
              </button>
            </div>

            {/* Drawer Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Product */}
              <div>
                <label className="form-label required">Select Product</label>
                <select
                  className="form-select"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  required
                >
                  <option value="" disabled>Select catalog SKU...</option>
                  {productsList.map((p) => (
                    <option key={p._id} value={p._id}>
                      [{p.sku}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div>
                <label className="form-label required">Movement Type</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="receive">Receive Goods (Add Stock)</option>
                  <option value="issue">Issue Goods (Remove Stock)</option>
                  <option value="transfer">Warehouse Transfer</option>
                  <option value="adjustment">Stock Adjustment (Audit delta)</option>
                  <option value="return">Customer Return (Add Stock)</option>
                </select>
              </div>

              {/* Warehouse source / primary */}
              <div>
                <label className="form-label required">
                  {formData.type === 'transfer' ? 'Source Warehouse' : 'Warehouse'}
                </label>
                <select
                  className="form-select"
                  value={formData.warehouse}
                  onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                  required
                >
                  <option value="" disabled>Select depot location...</option>
                  {warehouses?.map((w) => (
                    <option key={w._id} value={w._id}>
                      [{w.code}] {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Warehouse (only for Transfer) */}
              {formData.type === 'transfer' && (
                <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-3 space-y-3">
                  <span className="text-[10px] text-teal-650 font-bold uppercase tracking-wider block">Transfer Destination</span>
                  <div>
                    <label className="form-label required">Destination Warehouse</label>
                    <select
                      className="form-select bg-white"
                      value={formData.transferTo}
                      onChange={(e) => setFormData({ ...formData, transferTo: e.target.value })}
                      required
                    >
                      <option value="" disabled>Select destination depot...</option>
                      {warehouses?.map((w) => (
                        <option key={w._id} value={w._id}>
                          [{w.code}] {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="form-label required">Quantity</label>
                <input
                  type="number"
                  step="1"
                  min={formData.type === 'adjustment' ? undefined : 1}
                  className="form-input"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {formData.type === 'adjustment'
                    ? 'Enter a non-zero whole number: positive to add stock, negative to remove stock. On-hand cannot go below zero.'
                    : 'Enter a positive whole-number unit count.'}
                </p>
              </div>

              {/* Reference */}
              <div>
                <label className="form-label">Reference Number (PO / Invoice / Order)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="PO-92834"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Batch Number */}
                <div>
                  <label className="form-label">Batch Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="LOT-100A"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="form-label">Internal Operations Notes</label>
                <textarea
                  rows={2}
                  className="form-input py-2"
                  placeholder="Reason for adjustment, custom clearance delays, transit notes, etc."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
            </form>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={createMovementMutation.isPending}
                className="btn-primary text-xs py-2 px-4 shadow-teal-500/10"
              >
                {createMovementMutation.isPending ? 'Recording...' : 'Submit Ledger Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockMovementGrid;
