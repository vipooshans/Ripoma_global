import React from 'react';
import StockAvailabilityInline from './StockAvailabilityInline';

const DispatchItemsTable = ({ orderItems = [], warehouseId, dispatchItems = [], onChange }) => {
  const handleQtyChange = (productObjectId, val, maxVal) => {
    let qty = parseInt(val) || 0;
    if (qty < 0) qty = 0;
    if (qty > maxVal) qty = maxVal;

    const existingIdx = dispatchItems.findIndex(i => i.product === productObjectId);
    let newDispatchItems = [...dispatchItems];

    if (existingIdx > -1) {
      if (qty === 0) {
        newDispatchItems = newDispatchItems.filter(i => i.product !== productObjectId);
      } else {
        newDispatchItems[existingIdx] = {
          ...newDispatchItems[existingIdx],
          quantityDispatched: qty
        };
      }
    } else if (qty > 0) {
      newDispatchItems.push({
        product: productObjectId,
        quantityDispatched: qty
      });
    }

    onChange(newDispatchItems);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th className="px-6 py-3 text-left">Product</th>
            <th className="px-6 py-3 text-right">Ordered</th>
            <th className="px-6 py-3 text-right">Previously Dispatched</th>
            <th className="px-6 py-3 text-right">Remaining</th>
            <th className="px-6 py-3 text-center w-36">To Dispatch</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
          {orderItems.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                No items in order.
              </td>
            </tr>
          ) : (
            orderItems.map((item) => {
              const prev = item.quantityDispatched || 0;
              const remaining = Math.max(0, item.quantityOrdered - prev);
              
              const currentDispatch = dispatchItems.find(d => d.product === (item.product?._id || item.product))?.quantityDispatched || 0;

              return (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800 block">
                      {item.product?.name || item.description || 'Product Item'}
                    </span>
                    {item.product?.sku && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        SKU: {item.product.sku}
                      </span>
                    )}

                    {warehouseId && currentDispatch > 0 && (
                      <StockAvailabilityInline
                        productId={item.product?._id || item.product}
                        warehouseId={warehouseId}
                        quantityOrdered={currentDispatch}
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{item.quantityOrdered}</td>
                  <td className="px-6 py-4 text-right">{prev}</td>
                  <td className="px-6 py-4 text-right font-semibold text-indigo-600">{remaining}</td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="number"
                      min="0"
                      max={remaining}
                      disabled={remaining === 0}
                      value={currentDispatch}
                      onChange={(e) => handleQtyChange(item.product?._id || item.product, e.target.value, remaining)}
                      className="w-24 text-center rounded-lg border border-slate-300 px-2 py-1 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DispatchItemsTable;
