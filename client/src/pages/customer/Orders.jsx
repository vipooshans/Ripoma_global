import React, { useState, useEffect, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Home, ChevronRight, Package, ShoppingBag, ArrowRight, Loader2
} from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import storefrontService from '../../services/storefront.service';
import { formatPrice } from '../../utils/formatPrice';

const statusClass = (status) => {
  const map = {
    placed: 'bg-teal-50 text-teal-700 border-teal-200',
    confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
    processing: 'bg-amber-50 text-amber-700 border-amber-200',
    shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200'
  };
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
};

const CustomerOrders = () => {
  const { isAuthenticated, loading: authLoading } = useContext(CustomerAuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await storefrontService.getMyOrders();
        if (!cancelled) setOrders(data.orders || []);
      } catch {
        if (!cancelled) toast.error('Failed to load orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-teal-600" size={28} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/customer/login"
        replace
        state={{ from: { pathname: '/customer/orders' } }}
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
        <span className="text-slate-600 font-medium">Orders</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12 flex-1 w-full">
        <div className="flex items-center gap-2 mb-6">
          <Package size={20} className="text-teal-600" />
          <h1 className="text-xl font-extrabold text-slate-800">My Orders</h1>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-teal-600" size={28} />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-20 text-center">
            <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="font-bold text-slate-600">No orders yet</p>
            <p className="text-sm text-slate-400 mt-1">When you place an order, it will show up here.</p>
            <Link
              to="/customer/products"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl"
            >
              Start shopping <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/customer/orders/${order.id}`}
                className="block bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:border-teal-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-slate-800 text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {order.placedAt
                        ? new Date(order.placedAt).toLocaleString()
                        : '—'}
                      {' · '}
                      {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-900 text-sm">
                      {formatPrice(order.grandTotal, order.currency)}
                    </p>
                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusClass(order.orderStatus)}`}>
                      {order.orderStatus}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerOrders;
