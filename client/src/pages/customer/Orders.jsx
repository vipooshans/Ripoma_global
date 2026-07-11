import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Home, ChevronRight, Package, ShoppingBag, ArrowRight, Loader2
} from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import storefrontService from '../../services/storefront.service';
import { formatPrice } from '../../utils/formatPrice';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' }
];

const statusClass = (status) => {
  const map = {
    placed: 'bg-teal-50 text-teal-700 border-teal-200',
    confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
    processing: 'bg-amber-50 text-amber-700 border-amber-200',
    shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancellation_requested: 'bg-orange-50 text-orange-700 border-orange-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200'
  };
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
};

const statusLabel = (status) => {
  if (status === 'cancellation_requested') return 'Cancel requested';
  return status?.replace(/_/g, ' ') || status;
};

const CustomerOrders = () => {
  const { isAuthenticated, loading: authLoading } = useContext(CustomerAuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'delivered') return orders.filter((o) => o.orderStatus === 'delivered');
    if (filter === 'cancelled') {
      return orders.filter((o) =>
        ['cancelled', 'cancellation_requested'].includes(o.orderStatus)
      );
    }
    return orders.filter((o) =>
      !['delivered', 'cancelled'].includes(o.orderStatus)
    );
  }, [orders, filter]);

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
        <div className="flex items-center gap-2 mb-4">
          <Package size={20} className="text-teal-600" />
          <h1 className="text-xl font-extrabold text-slate-800">My Orders</h1>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.id
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="animate-spin text-teal-600" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-20 text-center">
            <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="font-bold text-slate-600">
              {orders.length === 0 ? 'No orders yet' : 'No orders in this filter'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {orders.length === 0
                ? 'When you place an order, it will show up here.'
                : 'Try another filter.'}
            </p>
            {orders.length === 0 && (
              <Link
                to="/customer/products"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl"
              >
                Start shopping <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
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
                      {' · '}
                      <span className="capitalize">{order.paymentStatus?.replace(/_/g, ' ')}</span>
                    </p>
                    {['processing', 'shipped'].includes(order.orderStatus) &&
                      order.estimatedDeliveryDate && (
                      <p className="text-[11px] font-bold text-teal-700 mt-1">
                        ETA{' '}
                        {new Date(order.estimatedDeliveryDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-slate-900 text-sm">
                      {formatPrice(order.grandTotal, order.currency)}
                    </p>
                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusClass(order.orderStatus)}`}>
                      {statusLabel(order.orderStatus)}
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
