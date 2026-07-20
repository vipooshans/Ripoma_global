export const DEFAULT_CURRENCY = 'LKR';

/**
 * Format a money amount for storefront / customer display.
 * Always shows "Rs" (LKR) so catalog items still stored as USD display correctly.
 */
export const formatPrice = (price, _currency = DEFAULT_CURRENCY) => {
  if (!price && price !== 0) return '—';

  const amount = Number(price).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `Rs ${amount}`;
};

/** Compact symbol for inline totals (tables, charts). */
export const currencySymbol = (_currency = DEFAULT_CURRENCY) => 'Rs';
