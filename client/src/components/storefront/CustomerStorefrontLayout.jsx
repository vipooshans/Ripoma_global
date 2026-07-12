import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import CustomerNavbar from './CustomerNavbar';
import CartDrawer from './CartDrawer';
import { getCart, addToCart as addItem, removeFromCart, updateCartQty, getCartCount } from '../../utils/cart';
import { getWishlist, getWishlistCount } from '../../utils/wishlist';

const StorefrontContext = createContext(null);

export const useStorefront = () => {
  const ctx = useContext(StorefrontContext);
  if (!ctx) throw new Error('useStorefront must be used within CustomerStorefrontLayout');
  return ctx;
};

const CustomerStorefrontLayout = () => {
  const { logout } = useContext(CustomerAuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [cart, setCart] = useState(getCart);
  const [wishlist, setWishlist] = useState(getWishlist);
  const [cartOpen, setCartOpen] = useState(false);

  const isHome = location.pathname === '/customer';
  const cartCount = getCartCount(cart);
  const wishlistCount = getWishlistCount(wishlist);

  useEffect(() => {
    const sync = () => setCart(getCart());
    window.addEventListener('cart-updated', sync);
    return () => window.removeEventListener('cart-updated', sync);
  }, []);

  useEffect(() => {
    const sync = () => setWishlist(getWishlist());
    window.addEventListener('wishlist-updated', sync);
    return () => window.removeEventListener('wishlist-updated', sync);
  }, []);

  const handleAddToCart = useCallback((product, openDrawer = true, qty = 1) => {
    const updated = addItem(product, qty);
    setCart(updated);
    if (openDrawer) {
      setCartOpen(true);
    }
  }, []);

  const handleRemove = useCallback((id) => {
    setCart(removeFromCart(id));
  }, []);

  const handleUpdateQty = useCallback((id, qty) => {
    setCart(updateCartQty(id, qty));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/customer/login');
  };

  const value = {
    cart,
    cartCount,
    wishlistCount,
    cartOpen,
    setCartOpen,
    addToCart: handleAddToCart,
    removeFromCart: handleRemove,
    updateCartQty: handleUpdateQty
  };

  return (
    <StorefrontContext.Provider value={value}>
      <div className="min-h-screen flex flex-col bg-white">
        {!isHome && (
          <CustomerNavbar
            variant="solid"
            cartCount={cartCount}
            wishlistCount={wishlistCount}
            onCartOpen={() => setCartOpen(true)}
            onLogout={handleLogout}
            showSearch
          />
        )}

        <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          onRemove={handleRemove}
          onUpdateQty={handleUpdateQty}
        />

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </StorefrontContext.Provider>
  );
};

export default CustomerStorefrontLayout;
