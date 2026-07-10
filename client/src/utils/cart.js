const CART_KEY = 'ripoma_cart';

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

export const addToCart = (product, qty = 1) => {
  const amount = Math.max(1, parseInt(qty, 10) || 1);
  const current = getCart();
  const existing = current.find((i) => i.id === product.id);
  const updated = existing
    ? current.map((i) => (i.id === product.id ? { ...i, qty: i.qty + amount } : i))
    : [...current, { ...product, qty: amount }];
  saveCart(updated);
  return updated;
};

export const removeFromCart = (id) => {
  const updated = getCart().filter((i) => i.id !== id);
  saveCart(updated);
  return updated;
};

export const updateCartQty = (id, qty) => {
  if (qty < 1) return removeFromCart(id);
  const updated = getCart().map((i) => (i.id === id ? { ...i, qty } : i));
  saveCart(updated);
  return updated;
};

export const getCartCount = (cart) => cart.reduce((sum, i) => sum + i.qty, 0);
