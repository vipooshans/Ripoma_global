import React from 'react';
import { useProductWarehouseStock } from '../../hooks/useInventory';

const StockAvailabilityInline = ({ productId, warehouseId, quantityOrdered }) => {
  const { data: stock, isLoading } = useProductWarehouseStock(productId, warehouseId);

  if (!productId || !warehouseId) return null;
  if (isLoading) return <span className="text-xs text-slate-400">Checking stock...</span>;

  // Virtual property quantityAvailable is calculated in the backend, or we can compute it
  const available = stock ? (stock.quantityOnHand - stock.quantityReserved) : 0;
  const isInsufficient = available < quantityOrdered;

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${isInsufficient ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
        Available: {available} (On Hand: {stock?.quantityOnHand || 0})
      </span>
      {isInsufficient && (
        <span className="inline-flex items-center text-xs font-semibold text-rose-600" title="Order quantity exceeds available warehouse stock!">
          ⚠️ Insufficient Stock
        </span>
      )}
    </div>
  );
};

export default StockAvailabilityInline;
