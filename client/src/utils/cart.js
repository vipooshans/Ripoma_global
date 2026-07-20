const CART_KEY = 'ripoma_cart';
const COUPON_KEY = 'ripoma_cart_coupon';

export const toCartSnapshot = (product, qty = 1) => ({
  id: product.id,
  name: product.name,
  sku: product.sku,
  sellingPrice: Number(product.sellingPrice) || 0,
  currency: product.currency || 'LKR',
  images: product.images || [],
  brand: product.brand || null,
  unit: product.unit || null,
  weight: product.weight ?? null,
  qty: Math.max(1, parseInt(qty, 10) || 1)
});

export const getCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
};

export const clearCart = () => {
  saveCart([]);
  return [];
};

export const getCartSubtotal = (cart = getCart()) =>
  cart.reduce((sum, item) => sum + (Number(item.sellingPrice) || 0) * (Number(item.qty) || 0), 0);

export const addToCart = (product, qty = 1) => {
  const amount = Math.max(1, parseInt(qty, 10) || 1);
  const current = getCart();
  const existing = current.find((i) => String(i.id) === String(product.id));
  const snapshot = toCartSnapshot(product, amount);
  const updated = existing
    ? current.map((i) =>
        String(i.id) === String(product.id)
          ? { ...toCartSnapshot({ ...i, ...snapshot }, i.qty + amount) }
          : i
      )
    : [...current, snapshot];
  saveCart(updated);
  return updated;
};

export const removeFromCart = (id) => {
  const updated = getCart().filter((i) => String(i.id) !== String(id));
  saveCart(updated);
  return updated;
};

export const updateCartQty = (id, qty) => {
  if (qty < 1) return removeFromCart(id);
  const updated = getCart().map((i) =>
    String(i.id) === String(id) ? { ...i, qty: Math.max(1, parseInt(qty, 10) || 1) } : i
  );
  saveCart(updated);
  return updated;
};

export const getCartCount = (cart = getCart()) =>
  cart.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

export const getStoredCouponCode = () => {
  try {
    return localStorage.getItem(COUPON_KEY) || '';
  } catch {
    return '';
  }
};

export const setStoredCouponCode = (code) => {
  const trimmed = (code || '').trim().toUpperCase();
  if (trimmed) localStorage.setItem(COUPON_KEY, trimmed);
  else localStorage.removeItem(COUPON_KEY);
  window.dispatchEvent(new Event('cart-coupon-updated'));
  return trimmed;
};

export const clearStoredCouponCode = () => {
  localStorage.removeItem(COUPON_KEY);
  window.dispatchEvent(new Event('cart-coupon-updated'));
};
