/**
 * Storefront cart pricing rules (shipping + tax).
 * Keep freeShippingMin aligned with homepage promo copy.
 */
const STOREFRONT_CART_RULES = {
  currency: 'USD',
  freeShippingMin: 500,
  flatShipping: 25,
  taxRate: 0.08
};

const getStorefrontCartRules = () => ({ ...STOREFRONT_CART_RULES });

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

module.exports = { STOREFRONT_CART_RULES, getStorefrontCartRules, round2 };
