import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Home, ChevronRight, Package, ShoppingCart, Trash2, Bookmark,
  ArrowRight, Tag, X, Loader2
} from 'lucide-react';
import { useStorefront } from '../../components/storefront/CustomerStorefrontLayout';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import storefrontService from '../../services/storefront.service';
import { formatPrice } from '../../utils/formatPrice';
import {
  getCartSubtotal,
  getStoredCouponCode,
  setStoredCouponCode,
  clearStoredCouponCode
} from '../../utils/cart';
import {
  getSaved,
  moveToSaved,
  moveToCart as moveSavedToCart,
  removeFromSaved
} from '../../utils/saveForLater';

const emptyEstimate = {
  subtotal: 0,
  discount: 0,
  shipping: 0,
  tax: 0,
  total: 0,
  currency: 'LKR',
  freeShippingMin: 500,
  coupon: null,
  messages: []
};

const CustomerCart = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(CustomerAuthContext);
  const { cart, removeFromCart, updateCartQty, setCartOpen } = useStorefront();

  const [saved, setSaved] = useState(getSaved);
  const [couponInput, setCouponInput] = useState(() => getStoredCouponCode());
  const [appliedCode, setAppliedCode] = useState(() => getStoredCouponCode());
  const [estimate, setEstimate] = useState(emptyEstimate);
  const [estimating, setEstimating] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const sync = () => setSaved(getSaved());
    window.addEventListener('save-for-later-updated', sync);
    return () => window.removeEventListener('save-for-later-updated', sync);
  }, []);

  const fetchEstimate = useCallback(async (items, code) => {
    if (!items.length) {
      setEstimate(emptyEstimate);
      setCouponError('');
      return;
    }
    setEstimating(true);
    try {
      const payload = {
        items: items.map((i) => ({
          id: i.id,
          qty: i.qty,
          sellingPrice: i.sellingPrice
        })),
        couponCode: code || undefined
      };
      const data = await storefrontService.estimateCart(payload);
      setEstimate(data);
      setCouponError('');
      if (code && !data.coupon) {
        clearStoredCouponCode();
        setAppliedCode('');
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Could not calculate totals';
      if (code) {
        setCouponError(message);
        // Still show totals without the invalid coupon
        try {
          const fallback = await storefrontService.estimateCart({
            items: items.map((i) => ({
              id: i.id,
              qty: i.qty,
              sellingPrice: i.sellingPrice
            }))
          });
          setEstimate(fallback);
        } catch {
          setEstimate({
            ...emptyEstimate,
            subtotal: getCartSubtotal(items)
          });
        }
        clearStoredCouponCode();
        setAppliedCode('');
      } else {
        toast.error(message);
        setEstimate({
          ...emptyEstimate,
          subtotal: getCartSubtotal(items)
        });
      }
    } finally {
      setEstimating(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchEstimate(cart, appliedCode);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [cart, appliedCode, fetchEstimate]);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError('');
    try {
      await storefrontService.validateCoupon({
        code,
        subtotal: getCartSubtotal(cart)
      });
      setStoredCouponCode(code);
      setAppliedCode(code);
      setCouponInput(code);
      toast.success('Coupon applied');
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearStoredCouponCode();
    setAppliedCode('');
    setCouponInput('');
    setCouponError('');
  };

  const handleSaveForLater = (id) => {
    moveToSaved(id);
    toast.success('Saved for later');
  };

  const handleMoveToCart = (id) => {
    moveSavedToCart(id);
    toast.success('Moved to cart');
  };

  const handleCheckout = () => {
    setCartOpen(false);
    if (!isAuthenticated) {
      navigate('/customer/login', { state: { from: { pathname: '/customer/checkout' } } });
      return;
    }
    navigate('/customer/checkout');
  };

  const merchandiseAfterDiscount = Math.max(0, (estimate.subtotal || 0) - (estimate.discount || 0));
  const freeShipRemaining = Math.max(0, (estimate.freeShippingMin || 500) - merchandiseAfterDiscount);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-slate-400 w-full">
        <Link to="/customer" className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <Home size={11} /> Home
        </Link>
        <ChevronRight size={11} />
        <span className="text-slate-600 font-medium">Cart</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12 flex-1 w-full">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart size={20} className="text-teal-600" />
          <h1 className="text-xl font-extrabold text-slate-800">Shopping Cart</h1>
          {cart.length > 0 && (
            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-20 text-center">
            <ShoppingCart size={56} className="mx-auto mb-4 text-slate-200" />
            <p className="font-bold text-slate-600 text-lg">Your cart is empty</p>
            <p className="text-sm text-slate-400 mt-1">Browse the catalog and add products to get started</p>
            <Link
              to="/customer/products"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Browse products <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex gap-4"
                >
                  <Link
                    to={`/customer/products/${item.id}`}
                    className="w-20 h-20 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden"
                  >
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={24} className="text-slate-300" />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/customer/products/${item.id}`}
                      className="font-bold text-slate-800 text-sm hover:text-teal-700 transition-colors line-clamp-2"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.sku}
                      {item.brand ? ` · ${item.brand}` : ''}
                    </p>
                    <p className="text-teal-600 font-extrabold text-sm mt-1.5">
                      {formatPrice(item.sellingPrice, item.currency)}
                      {item.unit ? <span className="text-slate-400 font-medium text-xs"> / {item.unit}</span> : null}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, item.qty - 1)}
                          className="w-7 h-7 bg-slate-100 rounded-lg text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="text-sm font-bold text-slate-800 w-6 text-center">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, item.qty + 1)}
                          className="w-7 h-7 bg-slate-100 rounded-lg text-slate-600 text-sm font-bold hover:bg-slate-200 transition-colors"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-extrabold text-slate-800">
                        {formatPrice(item.sellingPrice * item.qty, item.currency)}
                      </p>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleSaveForLater(item.id)}
                          className="text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors flex items-center gap-1"
                        >
                          <Bookmark size={12} /> Save for later
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 sticky top-24 space-y-4">
                <h2 className="font-extrabold text-slate-800 text-sm">Order summary</h2>

                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Tag size={11} /> Coupon code
                  </label>
                  {appliedCode && estimate.coupon ? (
                    <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-xs font-extrabold text-teal-700">{estimate.coupon.code}</p>
                        <p className="text-[10px] text-teal-600">{estimate.coupon.label}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="p-1 rounded-lg hover:bg-teal-100 text-teal-600"
                        aria-label="Remove coupon"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="e.g. SAVE10"
                        className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 uppercase"
                      />
                      <button
                        type="submit"
                        disabled={applyingCoupon || !couponInput.trim()}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        {applyingCoupon ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-rose-500 font-medium">{couponError}</p>}
                </form>

                <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatPrice(estimate.subtotal, estimate.currency)}</span>
                  </div>
                  {estimate.discount > 0 && (
                    <div className="flex justify-between text-teal-600">
                      <span>Discount</span>
                      <span className="font-semibold">−{formatPrice(estimate.discount, estimate.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping</span>
                    <span className="font-semibold">
                      {estimate.shipping === 0
                        ? 'Free'
                        : formatPrice(estimate.shipping, estimate.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (est.)</span>
                    <span className="font-semibold">{formatPrice(estimate.tax, estimate.currency)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="font-extrabold text-slate-800">Total</span>
                    <span className="font-extrabold text-lg text-slate-900 flex items-center gap-1.5">
                      {estimating && <Loader2 size={14} className="animate-spin text-teal-500" />}
                      {formatPrice(estimate.total, estimate.currency)}
                    </span>
                  </div>
                </div>

                {estimate.shipping > 0 && freeShipRemaining > 0 && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    Add <strong className="text-teal-700">{formatPrice(freeShipRemaining, estimate.currency)}</strong> more for free shipping
                  </p>
                )}
                {estimate.messages?.filter((m) => !m.includes('Add $')).map((msg) => (
                  <p key={msg} className="text-[11px] text-teal-700 font-medium">{msg}</p>
                ))}

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  Proceed to Checkout <ArrowRight size={15} />
                </button>
                <Link
                  to="/customer/products"
                  className="block text-center text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors"
                >
                  Continue shopping
                </Link>
              </div>
            </aside>
          </div>
        )}

        {saved.length > 0 && (
          <div className="mt-10">
            <h2 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <Bookmark size={15} className="text-teal-600" />
              Saved for later ({saved.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {saved.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex gap-3"
                >
                  <div className="w-14 h-14 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={18} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 line-clamp-2">{item.name}</p>
                    <p className="text-teal-600 font-extrabold text-xs mt-1">
                      {formatPrice(item.sellingPrice, item.currency)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleMoveToCart(item.id)}
                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700"
                      >
                        Move to cart
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromSaved(item.id)}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerCart;
