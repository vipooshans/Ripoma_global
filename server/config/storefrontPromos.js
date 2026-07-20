/**
 * Storefront promotion config for the customer portal homepage.
 * Override via STOREFRONT_PROMOS_JSON env var (JSON string) if needed.
 */

const DEFAULT_PROMOS = {
  marquee: [
    { text: 'Free shipping on orders over Rs 500', icon: 'truck' },
    { text: 'Verified quality standards', icon: 'shield' },
    { text: 'Same-day order processing', icon: 'zap' },
    { text: 'Worldwide delivery network', icon: 'globe' }
  ],
  cards: [
    {
      title: 'New Season Arrivals',
      subtitle: 'Explore the latest products added to our global catalog',
      link: '/customer/products?sort=newest',
      cta: 'Shop New'
    },
    {
      title: 'Bulk Order Savings',
      subtitle: 'Volume pricing available on select industrial goods',
      link: '/customer/products',
      cta: 'Browse Catalog'
    }
  ]
};

const getStorefrontPromos = () => {
  if (process.env.STOREFRONT_PROMOS_JSON) {
    try {
      return JSON.parse(process.env.STOREFRONT_PROMOS_JSON);
    } catch (err) {
      console.warn('[STOREFRONT] Invalid STOREFRONT_PROMOS_JSON, using defaults.');
    }
  }
  return DEFAULT_PROMOS;
};

module.exports = { getStorefrontPromos, DEFAULT_PROMOS };
