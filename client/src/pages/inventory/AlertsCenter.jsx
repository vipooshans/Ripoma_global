import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  useLowStockAlerts,
  useExpiringAlerts,
  useSaveAlertSettings
} from '../../hooks/useStockAlerts';
import {
  AlertTriangle,
  Clock,
  Settings2,
  Package,
  Calendar,
  Save,
  ShieldCheck,
  Building,
  HelpCircle
} from 'lucide-react';

const AlertsCenter = () => {
  // Tabs: 'low-stock' | 'expiring' | 'settings'
  const [activeTab, setActiveTab] = useState('low-stock');
  const [expiryDays, setExpiryDays] = useState(30);

  // Queries & Mutations
  const { data: lowStockItems, isLoading: lowStockLoading, refetch: refetchLowStock } = useLowStockAlerts();
  const { data: expiringItems, isLoading: expiringLoading } = useExpiringAlerts(expiryDays);
  const saveSettingsMutation = useSaveAlertSettings();

  // Settings update fields local state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lowStockVal, setLowStockVal] = useState(10);
  const [reorderVal, setReorderVal] = useState(50);

  const handleProductSelectChange = (e, products) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    
    // Find product details to prefill threshold values
    const prod = products.find(p => p._id === prodId);
    if (prod) {
      setLowStockVal(prod.lowStockThreshold || 0);
      setReorderVal(prod.reorderQuantity || 0);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error('Please select a product first.');
      return;
    }

    try {
      await saveSettingsMutation.mutateAsync({
        productId: selectedProductId,
        lowStockThreshold: parseInt(lowStockVal),
        reorderQuantity: parseInt(reorderVal)
      });
      toast.success('Product safety stock parameters saved.');
      refetchLowStock();
    } catch (err) {
      toast.error('Failed to update alert settings.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Stock Alerts Center</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Monitor warehouse lot expirations, track safety stock deficits, and adjust reorder boundaries.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex gap-4 text-xs font-bold text-slate-400">
        <button
          onClick={() => setActiveTab('low-stock')}
          className={`pb-2.5 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'low-stock' ? 'border-teal-650 text-teal-650' : 'border-transparent hover:text-slate-650'
          }`}
        >
          <AlertTriangle size={15} />
          <span>Low Stock Deficits ({lowStockItems?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('expiring')}
          className={`pb-2.5 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'expiring' ? 'border-teal-650 text-teal-650' : 'border-transparent hover:text-slate-650'
          }`}
        >
          <Clock size={15} />
          <span>Expiring Lots ({expiringItems?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-2.5 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'settings' ? 'border-teal-650 text-teal-650' : 'border-transparent hover:text-slate-650'
          }`}
        >
          <Settings2 size={15} />
          <span>Margin Settings</span>
        </button>
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">
        {activeTab === 'low-stock' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Low Stock Inventory Warnings</h3>
              <p className="text-[10px] text-slate-400">Products whose aggregate stock levels across all depots have dropped below safety thresholds.</p>
            </div>

            {lowStockLoading ? (
              <div className="space-y-2 py-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : !lowStockItems || lowStockItems.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold">
                All catalog products currently meet safety stock threshold requirements.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Current Stock</th>
                      <th className="py-2.5 px-3 text-right">Low Stock Limit</th>
                      <th className="py-2.5 px-3 text-right">Advised Reorder</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {lowStockItems.map((prod) => (
                      <tr key={prod._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold text-slate-800">{prod.sku}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700 leading-tight">{prod.name}</td>
                        <td className="py-3 px-3 text-slate-500 font-semibold">{prod.category?.name || '—'}</td>
                        <td className="py-3 px-3 text-right text-rose-500 font-extrabold">{prod.totalOnHand ?? 0} {prod.unit}</td>
                        <td className="py-3 px-3 text-right text-slate-600 font-semibold">{prod.lowStockThreshold} {prod.unit}</td>
                        <td className="py-3 px-3 text-right text-teal-650 font-extrabold">{prod.reorderQuantity} {prod.unit}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="border border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                            Replenish
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'expiring' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Approaching Expiration Dates</h3>
                <p className="text-[10px] text-slate-400">Warehouse inventory items with designated lot/expiry dates arriving soon.</p>
              </div>

              {/* Day filter input */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
                <span>Show batches expiring within:</span>
                <select
                  className="form-select py-1 px-2.5 text-xs bg-slate-50"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                >
                  <option value={15}>15 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                </select>
              </div>
            </div>

            {expiringLoading ? (
              <div className="space-y-2 py-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : !expiringItems || expiringItems.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold">
                No storage items are expiring within the selected window.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Expiry Date</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Depot</th>
                      <th className="py-2.5 px-3 text-right">On Hand</th>
                      <th className="py-2.5 px-3">Shelf Location</th>
                      <th className="py-2.5 px-3">Batch / Lot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {expiringItems.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-rose-600 font-extrabold whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} />
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">{item.product?.sku}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700 leading-tight">{item.product?.name}</td>
                        <td className="py-3 px-3 font-semibold text-slate-650">{item.warehouse?.code}</td>
                        <td className="py-3 px-3 text-right font-extrabold">{item.quantityOnHand} {item.product?.unit}</td>
                        <td className="py-3 px-3 text-slate-500 font-semibold">{item.location || '—'}</td>
                        <td className="py-3 px-3 text-slate-550 font-mono text-[10px]">{item.batchNumber || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left side: safety guidelines */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs font-semibold text-slate-600 space-y-4">
              <h4 className="font-extrabold text-slate-800 flex items-center gap-1">
                <HelpCircle size={14} className="text-teal-650" />
                <span>Safety Margins Guidelines</span>
              </h4>
              <p className="leading-relaxed">
                As a site supervisor, you can customize safety threshold variables per catalog SKU.
              </p>
              <div className="space-y-2 leading-relaxed">
                <div>
                  <strong className="text-slate-700 block mb-0.5">Low Stock Threshold:</strong>
                  <span>The aggregate quantity level at which the system highlights warnings.</span>
                </div>
                <div>
                  <strong className="text-slate-700 block mb-0.5">Reorder Increment:</strong>
                  <span>The recommended quantity to procure when safety warnings trigger.</span>
                </div>
              </div>
            </div>

            {/* Right side: update form */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm md:col-span-2 space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Adjust Product Safety Margins</h3>
                <p className="text-[10px] text-slate-400">Save custom threshold variables for alerts trigger logs.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                {/* Select Product */}
                <div>
                  <label className="form-label required">Select Catalog Product</label>
                  <select
                    className="form-select"
                    value={selectedProductId}
                    onChange={(e) => handleProductSelectChange(e, lowStockItems || [])}
                    required
                  >
                    <option value="" disabled>Select warning product...</option>
                    {lowStockItems?.map((prod) => (
                      <option key={prod._id} value={prod._id}>
                        [{prod.sku}] {prod.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Threshold */}
                  <div>
                    <label className="form-label required">Low Stock Threshold</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={lowStockVal}
                      onChange={(e) => setLowStockVal(e.target.value)}
                      required
                    />
                  </div>

                  {/* Reorder Qty */}
                  <div>
                    <label className="form-label required">Reorder Increment Qty</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={reorderVal}
                      onChange={(e) => setReorderVal(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saveSettingsMutation.isPending}
                    className="btn-primary text-xs py-2.5 px-5 shadow-teal-500/10 flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>{saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsCenter;
