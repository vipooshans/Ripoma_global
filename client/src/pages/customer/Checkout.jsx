import React, { useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Home, ChevronRight, ShoppingBag, ArrowLeft } from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import CustomerFooter from '../../components/storefront/CustomerFooter';

/**
 * Checkout stub for section 7. Full checkout flow is section 8.
 */
const CustomerCheckout = () => {
  const { isAuthenticated } = useContext(CustomerAuthContext);

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/customer/login"
        replace
        state={{ from: { pathname: '/customer/checkout' } }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-slate-400 w-full">
        <Link to="/customer" className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <Home size={11} /> Home
        </Link>
        <ChevronRight size={11} />
        <Link to="/customer/cart" className="hover:text-teal-600 transition-colors">Cart</Link>
        <ChevronRight size={11} />
        <span className="text-slate-600 font-medium">Checkout</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-16 flex-1 w-full text-center">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-10">
          <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-teal-600">
            <ShoppingBag size={28} />
          </div>
          <h1 className="text-xl font-extrabold text-slate-800">Checkout coming soon</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Shipping address, payment, and order placement will be available in the next release.
            Your cart and coupon are saved — you can keep shopping in the meantime.
          </p>
          <Link
            to="/customer/cart"
            className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <ArrowLeft size={14} /> Back to cart
          </Link>
        </div>
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerCheckout;
