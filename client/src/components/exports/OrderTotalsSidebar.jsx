import React from 'react';

const OrderTotalsSidebar = ({
  items = [],
  shippingCharge = 0,
  otherCharges = 0,
  onChangeShipping,
  onChangeOther,
  readOnly = false
}) => {
  // Client-side calculations to display live preview
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  items.forEach(item => {
    const qty = parseFloat(item.quantityOrdered) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const discount = parseFloat(item.discount) || 0;
    const tax = parseFloat(item.tax) || 0;

    const baseAmount = qty * price;
    const discountAmount = baseAmount * (discount / 100);
    const afterDiscount = baseAmount - discountAmount;
    const taxAmount = afterDiscount * (tax / 100);

    subtotal += afterDiscount;
    taxTotal += taxAmount;
    discountTotal += discountAmount;
  });

  const ship = parseFloat(shippingCharge) || 0;
  const other = parseFloat(otherCharges) || 0;
  const grandTotal = subtotal + taxTotal + ship + other;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="font-semibold text-slate-800 text-sm border-b pb-2">Cost Summary</h3>
      
      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-semibold text-slate-800">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount:</span>
          <span className="font-semibold text-rose-600">-${discountTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax:</span>
          <span className="font-semibold text-slate-800">${taxTotal.toFixed(2)}</span>
        </div>

        {/* Shipping Charge */}
        <div className="flex justify-between items-center py-1">
          <span>Shipping Charge:</span>
          {readOnly ? (
            <span className="font-semibold text-slate-800">${ship.toFixed(2)}</span>
          ) : (
            <div className="relative rounded-md shadow-sm w-28">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <span className="text-slate-400 text-xs">$</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingCharge}
                onChange={(e) => onChangeShipping(parseFloat(e.target.value) || 0)}
                className="w-full text-right rounded-md border border-slate-300 pl-5 pr-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Other Charges */}
        <div className="flex justify-between items-center py-1">
          <span>Other Charges:</span>
          {readOnly ? (
            <span className="font-semibold text-slate-800">${other.toFixed(2)}</span>
          ) : (
            <div className="relative rounded-md shadow-sm w-28">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <span className="text-slate-400 text-xs">$</span>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={otherCharges}
                onChange={(e) => onChangeOther(parseFloat(e.target.value) || 0)}
                className="w-full text-right rounded-md border border-slate-300 pl-5 pr-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="flex justify-between border-t pt-3 text-base font-bold text-slate-800">
          <span>Grand Total:</span>
          <span className="text-indigo-700">${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderTotalsSidebar;
