import { addToCart, getCart, removeFromCart, toCartSnapshot } from './cart';

const SAVED_KEY = 'ripoma_save_for_later';

export const getSaved = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveSaved = (items) => {
  localStorage.setItem(SAVED_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('save-for-later-updated'));
};

export const addToSaved = (product) => {
  const current = getSaved();
  if (current.some((i) => String(i.id) === String(product.id))) {
    return current;
  }
  const snapshot = toCartSnapshot(product, product.qty || 1);
  const updated = [...current, snapshot];
  saveSaved(updated);
  return updated;
};

export const removeFromSaved = (productId) => {
  const updated = getSaved().filter((i) => String(i.id) !== String(productId));
  saveSaved(updated);
  return updated;
};

/** Move an item from cart into save-for-later. */
export const moveToSaved = (productId) => {
  const cartItem = getCart().find((i) => String(i.id) === String(productId));
  if (!cartItem) return { cart: getCart(), saved: getSaved() };
  removeFromCart(productId);
  addToSaved(cartItem);
  return { cart: getCart(), saved: getSaved() };
};

/** Move an item from save-for-later back into the cart. */
export const moveToCart = (productId) => {
  const savedItem = getSaved().find((i) => String(i.id) === String(productId));
  if (!savedItem) return { cart: getCart(), saved: getSaved() };
  removeFromSaved(productId);
  addToCart(savedItem, savedItem.qty || 1);
  return { cart: getCart(), saved: getSaved() };
};
