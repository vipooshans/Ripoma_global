import React from 'react';
import { Trash2 } from 'lucide-react';

const LineItemsTable = ({
  items = [],
  isEditable = false,
  currency = 'LKR',
  onChangeItemField,
  onRemoveItem
}) => {
  const currencySymbols = {
    LKR: 'LKR',
    USD: '$',
    EUR: '€',
    CNY: '¥',
    GBP: '£'
  };

  const symbol = currencySymbols[currency] || 'LKR';

  if (items.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold bg-white/50">
        No products added to the list yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider">
            <th className="py-2.5 pr-2">SKU & Product</th>
            {isEditable ? (
              <>
                <th className="py-2.5 px-2 w-[80px] text-right">Qty</th>
                <th className="py-2.5 px-2 w-[110px] text-right">Cost ({currency})</th>
                <th className="py-2.5 px-2 w-[80px] text-right">Disc %</th>
                <th className="py-2.5 px-2 w-[80px] text-right">Tax %</th>
                <th className="py-2.5 px-2 w-[115px] text-right">Total</th>
                <th className="py-2.5 pl-2 text-right">Action</th>
              </>
            ) : (
              <>
                <th className="py-2.5 px-2 text-right">Ordered</th>
                <th className="py-2.5 px-2 text-right">Received</th>
                <th className="py-2.5 px-2 text-right">Pending</th>
                <th className="py-2.5 px-2 text-right">Unit Cost</th>
                <th className="py-2.5 px-2 text-right">Tax/Disc</th>
                <th className="py-2.5 pl-2 text-right">Line Total</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
          {items.map((item, idx) => {
            if (isEditable) {
              return (
                <tr key={item.product || idx}>
                  <td className="py-3 pr-2">
                    <span className="font-bold text-slate-900 leading-none">{item.sku}</span>
                    <span className="text-[10px] text-slate-450 block leading-none mt-1 truncate max-w-[160px] sm:max-w-[240px]">
                      {item.name}
                    </span>
                    <input
                      type="text"
                      placeholder="Description override..."
                      className="form-input text-[10px] py-1 px-2 mt-2 w-full max-w-[240px]"
                      value={item.description || ''}
                      onChange={(e) => onChangeItemField(idx, 'description', e.target.value)}
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      min="1"
                      className="form-input text-xs text-right py-1 px-2"
                      value={item.quantityOrdered}
                      onChange={(e) => onChangeItemField(idx, 'quantityOrdered', e.target.value)}
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input text-xs text-right py-1 px-2"
                      value={item.unitCost}
                      onChange={(e) => onChangeItemField(idx, 'unitCost', e.target.value)}
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-input text-xs text-right py-1 px-2"
                      value={item.discount}
                      onChange={(e) => onChangeItemField(idx, 'discount', e.target.value)}
                    />
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-input text-xs text-right py-1 px-2"
                      value={item.tax}
                      onChange={(e) => onChangeItemField(idx, 'tax', e.target.value)}
                    />
                  </td>
                  <td className="py-3 px-2 text-right text-slate-900 font-extrabold">
                    {symbol}{item.lineTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 pl-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            } else {
              const qtyOrdered = item.quantityOrdered || 0;
              const qtyReceived = item.quantityReceived || 0;
              const qtyPending = Math.max(0, qtyOrdered - qtyReceived);
              
              // Handle product population (could be object or ID)
              const productSku = item.product?.sku || item.sku || 'N/A';
              const productName = item.product?.name || item.name || 'Unknown Product';

              return (
                <tr key={item._id || item.product?._id || idx}>
                  <td className="py-3.5 pr-2">
                    <span className="font-bold text-slate-900 block leading-none">{productSku}</span>
                    <span className="text-[10px] text-slate-450 mt-1 block leading-none">{productName}</span>
                    {item.description && (
                      <span className="text-[10px] text-slate-500 italic block mt-1">"{item.description}"</span>
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-right font-extrabold text-slate-800">{qtyOrdered}</td>
                  <td className="py-3.5 px-2 text-right text-emerald-600 font-bold">{qtyReceived}</td>
                  <td className={`py-3.5 px-2 text-right font-bold ${qtyPending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {qtyPending}
                  </td>
                  <td className="py-3.5 px-2 text-right">{symbol}{item.unitCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-3.5 px-2 text-right text-[10px] text-slate-500 font-medium">
                    <div>Tax: {item.tax}%</div>
                    <div>Disc: {item.discount}%</div>
                  </td>
                  <td className="py-3.5 pl-2 text-right font-extrabold text-slate-950">
                    {symbol}{item.lineTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            }
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LineItemsTable;
