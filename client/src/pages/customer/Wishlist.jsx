import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Home, ChevronRight, Heart, Package, ShoppingCart, Trash2, ArrowRight
} from 'lucide-react';
import { useStorefront } from '../../components/storefront/CustomerStorefrontLayout';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import { formatPrice } from '../../utils/formatPrice';
import {
  getWishlist,
  removeFromWishlist,
  moveWishlistItemToCart,
  moveAllWishlistToCart
} from '../../utils/wishlist';

const CustomerWishlist = () => {
  const { setCartOpen } = useStorefront();
  const [items, setItems] = useState(getWishlist);

  useEffect(() => {
    const sync = () => setItems(getWishlist());
    window.addEventListener('wishlist-updated', sync);
    return () => window.removeEventListener('wishlist-updated', sync);
  }, []);

  const handleMoveToCart = (id) => {
    moveWishlistItemToCart(id);
    setItems(getWishlist());
    toast.success('Moved to cart');
    setCartOpen(true);
  };

  const handleMoveAll = () => {
    if (!items.length) return;
    const count = items.length;
    moveAllWishlistToCart();
    setItems([]);
    toast.success(`Added ${count} item${count === 1 ? '' : 's'} to cart`);
    setCartOpen(true);
  };

  const handleRemove = (id) => {
    removeFromWishlist(id);
    setItems(getWishlist());
    toast.success('Removed from wishlist');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 flex-1">
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link to="/customer" className="hover:text-teal-600 flex items-center gap-1">
            <Home size={12} /> Home
          </Link>
          <ChevronRight size={12} />
          <span className="text-slate-600 font-semibold">Wishlist</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Heart size={22} className="text-rose-500" />
              Wishlist
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {items.length === 0
                ? 'No saved products yet'
                : `${items.length} saved product${items.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleMoveAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <ShoppingCart size={15} />
              Add all to cart
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-rose-300" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 mb-2">Your wishlist is empty</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Tap the heart on any product to save it here for later.
            </p>
            <Link
              to="/customer/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Browse products <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex gap-4 items-center"
              >
                <Link
                  to={`/customer/products/${item.id}`}
                  className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden"
                >
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-slate-300" />
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  {item.brand && (
                    <p className="text-[10px] text-slate-500 font-semibold">{item.brand}</p>
                  )}
                  <Link
                    to={`/customer/products/${item.id}`}
                    className="text-sm font-bold text-slate-800 hover:text-teal-700 line-clamp-2 transition-colors"
                  >
                    {item.name}
                  </Link>
                  {item.sku && (
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.sku}</p>
                  )}
                  <p className="text-teal-600 font-extrabold text-sm mt-1">
                    {formatPrice(item.sellingPrice, item.currency)}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveToCart(item.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    <ShoppingCart size={13} />
                    Add to cart
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-rose-500 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors"
                    aria-label={`Remove ${item.name} from wishlist`}
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerWishlist;
