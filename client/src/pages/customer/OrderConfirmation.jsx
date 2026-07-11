import React, { useState, useEffect, useContext } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Home, ChevronRight, Package, CheckCircle2, ArrowRight, Loader2, ShoppingBag
} from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import storefrontService from '../../services/storefront.service';
import { formatPrice } from '../../utils/formatPrice';

const paymentLabel = (method) => {
  if (method === 'cod') return 'Cash on Delivery';
  if (method === 'bank_transfer') return 'Bank Transfer';
  if (method === 'card_mock') return 'Card (Demo)';
  return method;
};

const statusBadge = (status) => {
  const map = {
    placed: 'bg-teal-50 text-teal-700 border-teal-200',
    confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
    processing: 'bg-amber-50 text-amber-700 border-amber-200',
    shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    awaiting_transfer: 'bg-amber-50 text-amber-700 border-amber-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200'
  };
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
};

const CustomerOrderConfirmation = () => {
  const { id } = useParams();
  const { isAuthenticated, loading: authLoading } = useContext(CustomerAuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !id) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await storefrontService.getOrder(id);
        if (!cancelled) setOrder(data.order);
      } catch (err) {
        if (!cancelled) {
          toast.error(err.response?.data?.message || 'Order not found');
          setOrder(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, isAuthenticated]);

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
        state={{ from: { pathname: `/customer/orders/${id}` } }}
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
        <Link to="/customer/orders" className="hover:text-teal-600 transition-colors">Orders</Link>
        <ChevronRight size={11} />
        <span className="text-slate-600 font-medium">Confirmation</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12 flex-1 w-full">
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="animate-spin text-teal-600" size={28} />
          </div>
        ) : !order ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
            <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="font-bold text-slate-600">Order not found</p>
            <Link to="/customer/orders" className="text-sm font-bold text-teal-600 mt-4 inline-block">
              View all orders
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 text-center">
              <CheckCircle2 size={40} className="mx-auto text-teal-600 mb-3" />
              <h1 className="text-xl font-extrabold text-slate-800">Order confirmed</h1>
              <p className="text-sm text-slate-500 mt-1">Thank you — your order has been placed.</p>
              <p className="text-lg font-extrabold text-teal-700 mt-3">{order.orderNumber}</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${statusBadge(order.orderStatus)}`}>
                  {order.orderStatus}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${statusBadge(order.paymentStatus)}`}>
                  {order.paymentStatus.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-3">
              <h2 className="font-extrabold text-slate-800 text-sm">Items</h2>
              {order.items.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 overflow-hidden shrink-0">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={16} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 line-clamp-2">{item.name}</p>
                    <p className="text-xs text-slate-400">Qty {item.qty}</p>
                  </div>
                  <p className="text-sm font-extrabold">{formatPrice(item.lineTotal, order.currency)}</p>
                </div>
              ))}
              <div className="space-y-1 text-sm pt-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal, order.currency)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-teal-600">
                    <span>Discount</span>
                    <span>−{formatPrice(order.discount, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping, order.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>{formatPrice(order.tax, order.currency)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total</span>
                  <span>{formatPrice(order.grandTotal, order.currency)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-2">Shipping</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {order.shippingAddress?.street}<br />
                  {order.shippingAddress?.city}
                  {order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ''}
                  {order.shippingAddress?.postalCode ? ` ${order.shippingAddress.postalCode}` : ''}
                  <br />
                  {order.shippingAddress?.country}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-2">Payment</h3>
                <p className="text-sm text-slate-700">{paymentLabel(order.paymentMethod)}</p>
                {order.paymentReference && (
                  <p className="text-xs text-slate-500 mt-1">Ref: {order.paymentReference}</p>
                )}
                {order.paymentMethod === 'bank_transfer' && (
                  <p className="text-xs text-slate-500 mt-2">
                    Transfer to Rippoma Global ·····1234 using {order.orderNumber} as reference.
                  </p>
                )}
              </div>
            </div>

            {order.customerNote && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-2">Note</h3>
                <p className="text-sm text-slate-600">{order.customerNote}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link
                to="/customer/products"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl inline-flex items-center gap-2"
              >
                Continue shopping <ArrowRight size={14} />
              </Link>
              <Link
                to="/customer/orders"
                className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:border-teal-300 hover:text-teal-700 text-sm font-bold rounded-xl"
              >
                View all orders
              </Link>
            </div>
          </div>
        )}
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerOrderConfirmation;
