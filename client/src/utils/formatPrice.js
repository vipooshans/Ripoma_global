export const formatPrice = (price, currency = 'USD') => {
  if (!price && price !== 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2
  }).format(price);
};
