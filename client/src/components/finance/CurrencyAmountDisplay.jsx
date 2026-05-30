import React from 'react';
import { useBaseCurrency } from '../../hooks/useCurrencyRates';

const CurrencyAmountDisplay = ({ amount, currency, originalAmount, originalCurrency, rate }) => {
  const { data: baseData } = useBaseCurrency();
  const baseCurrency = baseData?.baseCurrency || 'USD';

  const format = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const currentAmount = amount || 0;
  const currentCurrency = currency || baseCurrency;

  // Case 1: Same currency or no original details
  if (!originalCurrency || originalCurrency === baseCurrency || (originalCurrency === currentCurrency && currentCurrency === baseCurrency)) {
    return <span className="font-mono text-xs">{baseCurrency} {format(currentAmount)}</span>;
  }

  // Case 2: Display base currency with original currency in brackets + tooltip
  const derivedRate = rate || (currentAmount / (originalAmount || 1));

  return (
    <span className="relative group inline-block font-mono text-xs cursor-help">
      <span className="text-slate-905">{baseCurrency} {format(currentAmount)}</span>
      <span className="text-slate-400 text-[10px] font-medium ml-1.5">
        (≈ {originalCurrency} {format(originalAmount)})
      </span>
      {/* Tooltip */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 bg-slate-900 text-slate-100 text-[9px] font-semibold py-1 px-2 rounded-md shadow-md border border-slate-750 tracking-normal text-center whitespace-nowrap">
        Exchange Rate: 1 {originalCurrency} = {format(derivedRate)} {baseCurrency}
      </span>
    </span>
  );
};

export default CurrencyAmountDisplay;
