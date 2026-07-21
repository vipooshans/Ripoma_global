import React from 'react';
import { useProducts } from '../../hooks/useInventory';
import StockAvailabilityInline from './StockAvailabilityInline';

const LineItemsTable = ({ items = [], warehouseId, onChange, readOnly = false }) => {
  const { data: productsData } = useProducts({ limit: 100 });
  const productsList = productsData?.products || [];

  const handleAddField = () => {
    if (readOnly) return;
    onChange([
      ...items,
      {
        product: '',
        description: '',
        quantityOrdered: 1,
        unitPrice: 0,
        discount: 0,
        tax: 0,
        lineTotal: 0
      }
    ]);
  };

  const handleRemoveField = (index) => {
    if (readOnly) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleFieldChange = (index, field, value) => {
    if (readOnly) return;
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === 'product') {
      const prod = productsList.find(p => p._id === value);
      item.product = value;
      item.description = prod ? prod.name : '';
      item.unitPrice = prod ? prod.price || 0 : 0;
    } else {
      item[field] = value;
    }

    // Recalculate line total: qty * price * (1 - discount/100)
    const qty = parseFloat(item.quantityOrdered) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discount) || 0;
    const lineVal = qty * price * (1 - disc / 100);
    item.lineTotal = Math.round(lineVal * 100) / 100;

    newItems[index] = item;
    onChange(newItems);
  };

  if (readOnly) {
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Product / Description</th>
              <th className="px-6 py-3 text-right">Qty Ordered</th>
              <th className="px-6 py-3 text-right">Qty Dispatched</th>
              <th className="px-6 py-3 text-right">Unit Price</th>
              <th className="px-6 py-3 text-right">Discount</th>
              <th className="px-6 py-3 text-right">Tax</th>
              <th className="px-6 py-3 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700 bg-white">
            {items.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                  No line items found.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item._id || idx}>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800 block">
                      {item.product?.name || item.description || 'Product Item'}
                    </span>
                    {item.product?.sku && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        SKU: {item.product.sku}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{item.quantityOrdered}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.quantityDispatched >= item.quantityOrdered ? 'bg-emerald-50 text-emerald-700' : item.quantityDispatched > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}>
                      {item.quantityDispatched}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">LKR {item.unitPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">{item.discount || 0}%</td>
                  <td className="px-6 py-4 text-right">{item.tax || 0}%</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">${(item.lineTotal || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-1/3">Product Selection</th>
              <th className="px-4 py-3 text-right w-16">Qty</th>
              <th className="px-4 py-3 text-right w-24">Price ($)</th>
              <th className="px-4 py-3 text-right w-20">Disc (%)</th>
              <th className="px-4 py-3 text-right w-20">Tax (%)</th>
              <th className="px-4 py-3 text-right w-28">Line Total</th>
              <th className="px-4 py-3 text-center w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50 hover:bg-opacity-50">
                <td className="px-4 py-3">
                  <select
                    value={item.product}
                    onChange={(e) => handleFieldChange(index, 'product', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
                    required
                  >
                    <option value="">Select a Product...</option>
                    {productsList.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.name} (SKU: {p.sku})
                      </option>
                    ))}
                  </select>
                  
                  {item.product && warehouseId && (
                    <StockAvailabilityInline
                      productId={item.product}
                      warehouseId={warehouseId}
                      quantityOrdered={item.quantityOrdered}
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantityOrdered}
                    onChange={(e) => handleFieldChange(index, 'quantityOrdered', parseInt(e.target.value) || 0)}
                    className="w-full text-right rounded-lg border border-slate-300 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={item.unitPrice}
                    onChange={(e) => handleFieldChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full text-right rounded-lg border border-slate-300 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.discount}
                    onChange={(e) => handleFieldChange(index, 'discount', parseFloat(e.target.value) || 0)}
                    className="w-full text-right rounded-lg border border-slate-300 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.tax}
                    onChange={(e) => handleFieldChange(index, 'tax', parseFloat(e.target.value) || 0)}
                    className="w-full text-right rounded-lg border border-slate-300 px-2 py-1.5 focus:border-indigo-500 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">
                  ${(item.lineTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveField(index)}
                    className="text-rose-500 hover:text-rose-700 text-sm font-semibold p-1 hover:bg-rose-50 rounded"
                    title="Remove item"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={handleAddField}
        className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center gap-1 p-1"
      >
        ➕ Add New Line Item
      </button>
    </div>
  );
};

export default LineItemsTable;
