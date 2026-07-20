export const DEFAULT_CURRENCY = 'LKR';

/**
 * Format a money amount for display.
 * LKR (default) uses "Rs" prefix; other ISO codes use Intl currency style.
 */
export const formatPrice = (price, currency = DEFAULT_CURRENCY) => {
  if (!price && price !== 0) return '—';

  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  const amount = Number(price).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (code === 'LKR' || code === 'RS') {
    return `Rs ${amount}`;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2
    }).format(price);
  } catch {
    return `${code} ${amount}`;
  }
};

/** Compact symbol for inline totals (tables, charts). */
export const currencySymbol = (currency = DEFAULT_CURRENCY) => {
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  if (code === 'LKR' || code === 'RS') return 'Rs';
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  if (code === 'GBP') return '£';
  if (code === 'CNY' || code === 'JPY') return '¥';
  return code;
};
