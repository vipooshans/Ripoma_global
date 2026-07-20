import React from 'react';

const OrderTotalsSidebar = ({
  subtotal = 0,
  discountTotal = 0,
  taxTotal = 0,
  shippingCost = 0,
  otherCharges = 0,
  grandTotal = 0,
  currency = 'LKR',
  exchangeRate = 1
}) => {
  const currencySymbols = {
    LKR: 'Rs',
    USD: '$',
    EUR: '€',
    CNY: '¥',
    GBP: '£'
  };

  const symbol = currencySymbols[currency] || 'Rs';

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-6 shadow-md h-fit space-y-6 lg:col-span-1">
      <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-450 border-b border-slate-800 pb-2">
        Running Costs Summary
      </h3>

      <div className="space-y-3 font-semibold text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Subtotal:</span>
          <span className="text-slate-100">{symbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Discounts:</span>
          <span className="text-rose-450">-{symbol}{discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Taxes Sum:</span>
          <span className="text-slate-100">{symbol}{taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Est. Shipping:</span>
          <span className="text-slate-100">{symbol}{(parseFloat(shippingCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Other Charges:</span>
          <span className="text-slate-100">{symbol}{(parseFloat(otherCharges) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
          <span className="text-slate-400 font-extrabold">Grand Total:</span>
          <span className="text-2xl font-extrabold text-teal-400">
            {symbol}{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-[10px] text-slate-500 font-normal ml-1">{currency}</span>
          </span>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-2.5 font-medium text-[10px] text-slate-400">
        <div className="flex gap-2">
          <span className="font-bold text-slate-350">Supplier currency:</span>
          <span>{currency}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-bold text-slate-350">Exchange conversion:</span>
          <span>1 {currency} = {exchangeRate} USD</span>
        </div>
        <div className="flex gap-2">
          <span className="font-bold text-slate-350">Approved Status:</span>
          <span>Needs {grandTotal >= 5000 ? '2 Levels' : '1 Level'}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderTotalsSidebar;
