import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProductDetail, useStockMovements } from '../../hooks/useInventory';
import {
  ArrowLeft,
  Edit2,
  Calendar,
  Building,
  DollarSign,
  AlertTriangle,
  Folder,
  Tag,
  Scale,
  Compass,
  Barcode,
  History,
  FileText
} from 'lucide-react';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Queries
  const { data: detail, isLoading, error } = useProductDetail(id);
  const { data: movements } = useStockMovements({ product: id });

  // UI state for image gallery preview
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading catalog profile details...</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="text-center py-12 bg-white border border-slate-200 rounded-xl p-8 max-w-md mx-auto shadow-sm space-y-4">
        <AlertTriangle className="text-rose-500 mx-auto" size={40} />
        <h3 className="font-extrabold text-slate-800 text-sm">Product Profile Not Found</h3>
        <p className="text-slate-500 text-xs">The requested product profile could not be found or has been soft-deleted.</p>
        <Link to="/inventory/products" className="btn-primary text-xs py-2 px-4 block">
          Return to Directory
        </Link>
      </div>
    );
  }

  const { product, stockLevels } = detail;
  const images = product.images && product.images.length > 0 ? product.images : [];
  const activeImage = images[activeImageIdx] || null;

  // Stock gauge calculation
  const totalStock = product.totalStock || 0;
  const threshold = product.lowStockThreshold || 0;
  const percentOfThreshold = threshold > 0 ? Math.min(100, Math.round((totalStock / threshold) * 100)) : 100;

  let progressColor = 'bg-teal-500';
  let progressBg = 'bg-teal-50';
  let progressText = 'text-teal-700';
  if (totalStock <= threshold) {
    progressColor = 'bg-rose-500 animate-pulse';
    progressBg = 'bg-rose-50';
    progressText = 'text-rose-700';
  } else if (totalStock <= threshold + 20) {
    progressColor = 'bg-amber-500';
    progressBg = 'bg-amber-50';
    progressText = 'text-amber-700';
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Edit button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/inventory/products"
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">
              {product.sku}
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{product.name}</h1>
          </div>
        </div>
        <Link
          to={`/inventory/products/${product._id}/edit`}
          className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm"
        >
          <Edit2 size={14} />
          <span>Edit Product</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image gallery & Quick stats */}
        <div className="space-y-4 lg:col-span-1">
          {/* Main Photo Card */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col p-4">
            <div className="h-60 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative">
              {activeImage ? (
                <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <FileText size={48} className="text-slate-300" />
              )}
            </div>

            {/* Thumbnail selector */}
            {images.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`w-10 h-10 rounded border overflow-hidden bg-slate-50 transition-all ${
                      idx === activeImageIdx ? 'border-teal-500 ring-2 ring-teal-100' : 'border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Safety Stock Indicator Gauge */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <AlertTriangle className="text-amber-500" size={14} />
              <span>Safety Stock Gauge</span>
            </h3>
            <div className={`p-3 rounded-lg border ${progressBg} border-slate-100 space-y-2`}>
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-500">Current Stock:</span>
                <span className={progressText}>{totalStock} {product.unit}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-500">Low Stock Limit:</span>
                <span className="text-slate-700">{threshold} {product.unit}</span>
              </div>

              {/* Progress bar container */}
              <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${progressColor}`} style={{ width: `${percentOfThreshold}%` }} />
              </div>

              {totalStock <= threshold ? (
                <p className="text-[10px] text-rose-600 font-bold leading-tight pt-1">
                  WARNING: Deficit Alert. Stock is currently at or below the safety margin limit.
                </p>
              ) : totalStock <= threshold + 20 ? (
                <p className="text-[10px] text-amber-600 font-bold leading-tight pt-1">
                  CAUTION: Restock Advised. Stock is near safety margin.
                </p>
              ) : (
                <p className="text-[10px] text-teal-600 font-bold leading-tight pt-1">
                  Stock levels are currently sufficient.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Middle & Right Column: Details & Warehouse list */}
        <div className="space-y-6 lg:col-span-2">
          {/* Attributes Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-xs border-b border-slate-100 pb-2">
              Product Attributes Matrix
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs font-semibold text-slate-700">
              {/* Category */}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Folder size={14} /> Category:
                </span>
                <span className="text-slate-800">{product.category?.name || 'Uncategorized'}</span>
              </div>

              {/* Barcode */}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Barcode size={14} /> Barcode:
                </span>
                <span className="text-slate-800 font-bold font-mono">{product.barcode || '—'}</span>
              </div>

              {/* HS Code */}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Compass size={14} /> HS Code:
                </span>
                <span className="text-slate-800 font-mono">{product.hsCode || '—'}</span>
              </div>

              {/* Country of origin */}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Tag size={14} /> Origin Country:
                </span>
                <span className="text-slate-800">{product.countryOfOrigin || '—'}</span>
              </div>

              {/* Base purchasing cost */}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <DollarSign size={14} /> Purchasing Cost:
                </span>
                <span className="text-slate-800 font-bold">
                  {product.currency} {product.unitCost?.toFixed(2)}
                </span>
              </div>

              {/* Selling price */}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <DollarSign size={14} /> Selling Value:
                </span>
                <span className="text-teal-600 font-extrabold">
                  {product.currency} {product.sellingPrice?.toFixed(2)}
                </span>
              </div>

              {/* Unit Weight */}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Scale size={14} /> Weight:
                </span>
                <span className="text-slate-800">{product.weight ? `${product.weight} kg` : '—'}</span>
              </div>

              {/* Unit Dimensions */}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Scale size={14} /> Package Sizes:
                </span>
                <span className="text-slate-800">
                  {product.dimensions?.length} × {product.dimensions?.width} × {product.dimensions?.height} cm
                </span>
              </div>
            </div>

            {/* Product description */}
            {product.description && (
              <div className="pt-2 text-xs leading-relaxed text-slate-500">
                <h4 className="font-bold text-slate-700 mb-1">Details & Special Instructions</h4>
                <p>{product.description}</p>
              </div>
            )}
          </div>

          {/* Warehouse breakdown list */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <Building className="text-teal-650" size={14} />
              <span>Multi-Warehouse Stock Distributions</span>
            </h3>

            {!stockLevels || stockLevels.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-semibold">
                No warehouse has registered stock for this item yet. Record a movement to ingest stock.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-2 px-3">Warehouse Code</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3 text-right">On Hand</th>
                      <th className="py-2 px-3 text-right">Reserved</th>
                      <th className="py-2 px-3 text-right">Available</th>
                      <th className="py-2 px-3">Shelf Loc</th>
                      <th className="py-2 px-3">Batch / Lot</th>
                      <th className="py-2 px-3">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {stockLevels.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-bold text-slate-800">{item.warehouse?.code}</td>
                        <td className="py-3 px-3 font-semibold text-slate-600 truncate max-w-[120px]" title={item.warehouse?.name}>
                          {item.warehouse?.name}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold">{item.quantityOnHand}</td>
                        <td className="py-3 px-3 text-right text-slate-400">{item.quantityReserved}</td>
                        <td className="py-3 px-3 text-right text-teal-600 font-extrabold">{item.quantityAvailable}</td>
                        <td className="py-3 px-3 text-slate-500 font-semibold">{item.location || '—'}</td>
                        <td className="py-3 px-3 text-slate-500 font-mono text-[10px]">{item.batchNumber || '—'}</td>
                        <td className="py-3 px-3 text-slate-450 text-[10px]">
                          {item.expiryDate ? (
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              {new Date(item.expiryDate).toLocaleDateString()}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit ledger */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <History className="text-teal-650" size={14} />
              <span>Audit Ledger Trail</span>
            </h3>

            {!movements || movements.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-semibold">
                No movements ledger matches this product yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Depot</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3">Reference No</th>
                      <th className="py-2 px-3">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {movements.slice(0, 10).map((m) => {
                      let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (m.type === 'receive' || m.type === 'transfer_in') badgeClass = 'bg-teal-50 text-teal-700 border-teal-150';
                      if (m.type === 'issue' || m.type === 'transfer_out') badgeClass = 'bg-rose-50 text-rose-700 border-rose-150';
                      if (m.type === 'adjustment') badgeClass = 'bg-amber-50 text-amber-700 border-amber-150';

                      return (
                        <tr key={m._id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`border px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${badgeClass}`}>
                              {m.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-600">{m.warehouse?.code}</td>
                          <td className={`py-2.5 px-3 text-right font-extrabold ${m.quantity > 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-500">{m.reference || '—'}</td>
                          <td className="py-2.5 px-3 text-slate-500 text-[10px] whitespace-nowrap">
                            {m.performedBy?.name || 'System'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
