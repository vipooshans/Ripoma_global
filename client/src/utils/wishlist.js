import { addToCart, getCart } from './cart';

const WISHLIST_KEY = 'ripoma_wishlist';

export const getWishlist = () => {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveWishlist = (items) => {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('wishlist-updated'));
};

const toSnapshot = (product) => ({
  id: product.id,
  name: product.name,
  sku: product.sku,
  sellingPrice: product.sellingPrice,
  currency: product.currency,
  images: product.images || [],
  brand: product.brand || null
});

export const getWishlistCount = (items = getWishlist()) => items.length;

export const isInWishlist = (productId) => {
  return getWishlist().some((i) => String(i.id) === String(productId));
};

export const addToWishlist = (product) => {
  const current = getWishlist();
  if (current.some((i) => String(i.id) === String(product.id))) {
    return current;
  }
  const updated = [...current, toSnapshot(product)];
  saveWishlist(updated);
  return updated;
};

export const removeFromWishlist = (productId) => {
  const updated = getWishlist().filter((i) => String(i.id) !== String(productId));
  saveWishlist(updated);
  return updated;
};

export const toggleWishlist = (product) => {
  if (isInWishlist(product.id)) {
    return { items: removeFromWishlist(product.id), added: false };
  }
  return { items: addToWishlist(product), added: true };
};

/** Move one wishlist item into the cart and remove it from the wishlist. */
export const moveWishlistItemToCart = (productId) => {
  const item = getWishlist().find((i) => String(i.id) === String(productId));
  if (!item) return { cart: getCart(), wishlist: getWishlist() };
  addToCart(item, 1);
  removeFromWishlist(productId);
  return { cart: getCart(), wishlist: getWishlist() };
};

/** Move every wishlist item into the cart, then clear the wishlist. */
export const moveAllWishlistToCart = () => {
  const items = getWishlist();
  items.forEach((item) => addToCart(item, 1));
  saveWishlist([]);
  return { cart: getCart(), wishlist: [] };
};
