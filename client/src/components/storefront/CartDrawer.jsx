import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, X, ArrowRight } from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import { formatPrice } from '../../utils/formatPrice';

const CartDrawer = ({ open, onClose, cart, onRemove, onUpdateQty }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(CustomerAuthContext);
  const total = cart.reduce((sum, item) => sum + item.sellingPrice * item.qty, 0);

  const handleCheckout = () => {
    onClose();
    if (isAuthenticated) {
      navigate('/customer/products');
    } else {
      navigate('/customer/login', { state: { from: { pathname: '/customer/products' } } });
    }
  };

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={onClose}
          aria-label="Close cart"
        />
      )}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-teal-600" />
            <h2 className="font-extrabold text-slate-800 text-base">Your Cart</h2>
            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-8">
            <ShoppingCart size={48} className="text-slate-200" />
            <p className="font-semibold">Your cart is empty</p>
            <p className="text-xs text-center">Add products from the catalog to get started</p>
            <Link to="/customer/products" onClick={onClose} className="text-sm font-bold text-teal-600 hover:text-teal-700 mt-2">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center text-slate-300 shrink-0 border border-slate-100">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-xs leading-tight line-clamp-2">{item.name}</p>
                  <p className="text-teal-600 font-bold text-xs mt-1">{formatPrice(item.sellingPrice, item.currency)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, item.qty - 1)}
                      className="w-6 h-6 bg-slate-200 rounded text-slate-600 text-xs font-bold flex items-center justify-center hover:bg-slate-300 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="text-xs font-bold text-slate-800 w-5 text-center">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, item.qty + 1)}
                      className="w-6 h-6 bg-slate-200 rounded text-slate-600 text-xs font-bold flex items-center justify-center hover:bg-slate-300 transition-colors"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="ml-auto text-rose-400 hover:text-rose-600 transition-colors text-xs font-bold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div className="border-t border-slate-100 p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700 text-sm">Total</span>
              <span className="font-extrabold text-slate-900 text-lg">{formatPrice(total)}</span>
            </div>
            <button type="button" onClick={handleCheckout} className="btn-primary w-full py-3 text-sm">
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartDrawer;
