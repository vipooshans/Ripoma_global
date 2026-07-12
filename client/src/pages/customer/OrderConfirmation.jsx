import React, { useState, useEffect, useContext } from 'react';
import { Link, Navigate, useParams, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Home, ChevronRight, Package, CheckCircle2, ArrowRight, Loader2, ShoppingBag,
  Download, RotateCcw, XCircle, Truck, ExternalLink, Calendar
} from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import storefrontService from '../../services/storefront.service';
import { addToCart } from '../../utils/cart';
import { formatPrice } from '../../utils/formatPrice';

const FLOW_STEPS = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];

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
    cancellation_requested: 'bg-orange-50 text-orange-700 border-orange-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    awaiting_transfer: 'bg-amber-50 text-amber-700 border-amber-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200'
  };
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
};

const CustomerOrderDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useContext(CustomerAuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const justPlaced = Boolean(location.state?.justPlaced);

  useEffect(() => {
    if (!isAuthenticated || !id) return undefined;
    let cancelled = false;
    (async () => {
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
    })();
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

  const canCancel = order && ['placed', 'confirmed'].includes(order.orderStatus);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await storefrontService.downloadOrderInvoice(order.id, order.orderNumber);
      toast.success('Invoice downloaded');
    } catch {
      toast.error('Could not download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const handleReorder = () => {
    if (!order?.items?.length) return;
    order.items.forEach((item) => {
      addToCart(
        {
          id: item.productId,
          name: item.name,
          sku: item.sku,
          sellingPrice: item.unitPrice,
          currency: order.currency,
          images: item.image ? [item.image] : []
        },
        item.qty
      );
    });
    toast.success('Items added to cart');
    navigate('/customer/cart');
  };

  const handleCancelRequest = async () => {
    setCancelling(true);
    try {
      const data = await storefrontService.requestOrderCancel(order.id, {
        reason: cancelReason.trim() || undefined
      });
      setOrder(data.order);
      setCancelOpen(false);
      setCancelReason('');
      toast.success('Cancellation requested');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not request cancellation');
    } finally {
      setCancelling(false);
    }
  };

  const stepIndex = order ? FLOW_STEPS.indexOf(order.orderStatus) : -1;
  const isCancelled = order?.orderStatus === 'cancelled';
  const isCancelRequested = order?.orderStatus === 'cancellation_requested';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-slate-400 w-full">
        <Link to="/customer" className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <Home size={11} /> Home
        </Link>
        <ChevronRight size={11} />
        <Link to="/customer/orders" className="hover:text-teal-600 transition-colors">Orders</Link>
        <ChevronRight size={11} />
        <span className="text-slate-600 font-medium">
          {justPlaced ? 'Confirmation' : 'Details'}
        </span>
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
              {justPlaced && !isCancelled && (
                <CheckCircle2 size={40} className="mx-auto text-teal-600 mb-3" />
              )}
              <h1 className="text-xl font-extrabold text-slate-800">
                {justPlaced ? 'Order confirmed' : 'Order details'}
              </h1>
              {justPlaced && (
                <p className="text-sm text-slate-500 mt-1">Thank you — your order has been placed.</p>
              )}
              <p className="text-lg font-extrabold text-teal-700 mt-3">{order.orderNumber}</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${statusBadge(order.orderStatus)}`}>
                  {order.orderStatus === 'cancellation_requested'
                    ? 'Cancel requested'
                    : order.orderStatus.replace(/_/g, ' ')}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${statusBadge(order.paymentStatus)}`}>
                  {order.paymentStatus.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Status tracker */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h2 className="font-extrabold text-slate-800 text-sm mb-4">Track status</h2>
              {isCancelled || isCancelRequested ? (
                <p className={`text-sm font-bold ${isCancelled ? 'text-rose-600' : 'text-orange-600'}`}>
                  {isCancelled
                    ? 'This order has been cancelled.'
                    : 'Cancellation requested — awaiting staff review.'}
                  {order.cancelReason ? ` Reason: ${order.cancelReason}` : ''}
                </p>
              ) : (
                <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                  {FLOW_STEPS.map((step, idx) => {
                    const done = stepIndex >= idx;
                    const current = stepIndex === idx;
                    return (
                      <div key={step} className="flex-1 min-w-[56px] text-center">
                        <div
                          className={`mx-auto w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                            done ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'
                          } ${current ? 'ring-2 ring-teal-300' : ''}`}
                        >
                          {idx + 1}
                        </div>
                        <p className={`text-[10px] mt-1.5 font-bold capitalize ${done ? 'text-teal-700' : 'text-slate-400'}`}>
                          {step}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              {(order.trackingNumber || order.carrier || order.trackingUrl || order.estimatedDeliveryDate || order.actualDeliveredAt) && (
                <div className="mt-4 space-y-2">
                  {!isCancelled && !isCancelRequested && order.estimatedDeliveryDate &&
                    ['processing', 'shipped'].includes(order.orderStatus) && (
                    <div className="flex items-center gap-2 text-sm font-bold text-teal-800 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                      <Calendar size={14} className="shrink-0" />
                      Estimated delivery:{' '}
                      {new Date(order.estimatedDeliveryDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  )}
                  {order.orderStatus === 'delivered' && order.actualDeliveredAt && (
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      <CheckCircle2 size={14} className="shrink-0" />
                      Delivered on {new Date(order.actualDeliveredAt).toLocaleString()}
                    </div>
                  )}
                  {(order.trackingNumber || order.carrier || order.trackingUrl) && (
                    <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      <Truck size={14} className="text-teal-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        {order.carrier && <p className="font-bold text-slate-800">{order.carrier}</p>}
                        {order.trackingNumber && <p>Tracking: {order.trackingNumber}</p>}
                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-800"
                          >
                            Track with carrier <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(order.shipmentUpdates?.length > 0 || order.statusHistory?.length > 0) && (
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {order.shipmentUpdates?.length ? 'Shipment updates' : 'History'}
                  </p>
                  {order.shipmentUpdates?.length > 0
                    ? [...order.shipmentUpdates].reverse().slice(0, 10).map((u, i) => (
                        <div key={`su-${i}`} className="flex justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-700">{u.message}</span>
                          <span className="text-slate-400 shrink-0">
                            {u.at ? new Date(u.at).toLocaleString() : ''}
                          </span>
                        </div>
                      ))
                    : [...order.statusHistory].reverse().slice(0, 6).map((h, i) => (
                        <div key={`${h.status}-${i}`} className="flex justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-700 capitalize">
                            {h.status.replace(/_/g, ' ')}
                            {h.note ? ` — ${h.note}` : ''}
                          </span>
                          <span className="text-slate-400 shrink-0">
                            {h.at ? new Date(h.at).toLocaleString() : ''}
                          </span>
                        </div>
                      ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-700 disabled:opacity-50"
              >
                {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Download invoice
              </button>
              <button
                type="button"
                onClick={handleReorder}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:text-teal-700"
              >
                <RotateCcw size={13} /> Reorder
              </button>
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                >
                  <XCircle size={13} /> Request cancel
                </button>
              )}
            </div>

            {cancelOpen && (
              <div className="bg-white rounded-xl border border-rose-100 shadow-sm p-5 space-y-3">
                <h3 className="font-extrabold text-slate-800 text-sm">Request cancellation</h3>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Optional reason"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    disabled={cancelling}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                  >
                    {cancelling ? 'Submitting…' : 'Submit request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelOpen(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

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
              </div>
            </div>

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

export default CustomerOrderDetail;
