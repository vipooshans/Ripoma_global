import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Home, ChevronRight, ShoppingBag, Package, ArrowLeft, ArrowRight,
  MapPin, Building2, Loader2, Check
} from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import { useStorefront } from '../../components/storefront/CustomerStorefrontLayout';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import storefrontService from '../../services/storefront.service';
import customerAuthService from '../../services/customerAuth.service';
import { formatPrice } from '../../utils/formatPrice';
import {
  clearCart,
  clearStoredCouponCode,
  getStoredCouponCode
} from '../../utils/cart';

const STEPS = [
  { id: 1, label: 'Shipping' },
  { id: 2, label: 'Review' },
  { id: 3, label: 'Payment' }
];

const PAYMENT_OPTIONS = [
  {
    id: 'bank_transfer',
    title: 'Bank Transfer',
    desc: 'Transfer funds using your order number as reference',
    icon: Building2
  }
];

const BANK_DETAILS = {
  payTo: 'RIPOMA GLOBAL TRADIN',
  bank: "People's Bank",
  accountNo: '255100110082556'
};

const WHATSAPP_NUMBER = '94742522230'; // +94 74 252 2230
const WHATSAPP_DISPLAY = '+94 74 252 2230';

const emptyEstimate = {
  subtotal: 0,
  discount: 0,
  shipping: 0,
  tax: 0,
  total: 0,
  currency: 'LKR',
  coupon: null
};

const buildWhatsAppUrl = ({ orderNumber, cart, estimate, customer, shipping }) => {
  const items = cart
    .map(
      (i, idx) =>
        `${idx + 1}. ${i.name} x ${i.qty} — ${formatPrice(i.sellingPrice * i.qty, i.currency)}`
    )
    .join('\n');

  const address = [shipping.street, shipping.city, shipping.state, shipping.postalCode, shipping.country]
    .filter(Boolean)
    .join(', ');

  const lines = [
    `Hello ${BANK_DETAILS.payTo}, I have just placed order *${orderNumber}* and selected Bank Transfer as my payment method.`,
    '',
    '*Order Details*',
    items,
    `Subtotal: ${formatPrice(estimate.subtotal, estimate.currency)}`,
    estimate.discount > 0
      ? `Discount${estimate.coupon ? ` (${estimate.coupon.code})` : ''}: -${formatPrice(estimate.discount, estimate.currency)}`
      : null,
    `Shipping: ${estimate.shipping === 0 ? 'Free' : formatPrice(estimate.shipping, estimate.currency)}`,
    `Tax: ${formatPrice(estimate.tax, estimate.currency)}`,
    `*Total: ${formatPrice(estimate.total, estimate.currency)}*`,
    '',
    '*Customer Details*',
    `Name: ${`${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || '—'}`,
    customer?.email ? `Email: ${customer.email}` : null,
    customer?.phone ? `Phone: ${customer.phone}` : null,
    `Shipping Address: ${address}`,
    '',
    '*Payment Details*',
    `Pay to: ${BANK_DETAILS.payTo}`,
    `Bank: ${BANK_DETAILS.bank}`,
    `Account No: ${BANK_DETAILS.accountNo}`,
    `Payment Reference: ${orderNumber}`,
    '',
    'I will transfer the total to this account and send the payment receipt to this WhatsApp number.'
  ].filter((line) => line !== null);

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
};

const CustomerCheckout = () => {
  const navigate = useNavigate();
  const { isAuthenticated, customerUser, setCustomerUser, loading: authLoading } =
    useContext(CustomerAuthContext);
  const { cart, setCartOpen } = useStorefront();

  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  });
  const [saveAddress, setSaveAddress] = useState(true);
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [estimate, setEstimate] = useState(emptyEstimate);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shippingErrors, setShippingErrors] = useState({});

  useEffect(() => {
    setCartOpen(false);
  }, [setCartOpen]);

  useEffect(() => {
    if (!customerUser) return;
    const addr = customerUser.shippingAddress || {};
    setShipping({
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      country: addr.country || ''
    });
  }, [customerUser]);

  const fetchEstimate = useCallback(async () => {
    if (!cart.length) {
      setEstimate(emptyEstimate);
      return;
    }
    setEstimating(true);
    try {
      const code = getStoredCouponCode();
      const data = await storefrontService.estimateCart({
        items: cart.map((i) => ({
          id: i.id,
          qty: i.qty,
          sellingPrice: i.sellingPrice
        })),
        couponCode: code || undefined
      });
      setEstimate(data);
    } catch {
      setEstimate({
        ...emptyEstimate,
        subtotal: cart.reduce((s, i) => s + i.sellingPrice * i.qty, 0),
        total: cart.reduce((s, i) => s + i.sellingPrice * i.qty, 0)
      });
    } finally {
      setEstimating(false);
    }
  }, [cart]);

  useEffect(() => {
    if (step >= 2 && cart.length) fetchEstimate();
  }, [step, cart, fetchEstimate]);

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
        state={{ from: { pathname: '/customer/checkout' } }}
      />
    );
  }

  if (!cart.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="max-w-lg mx-auto px-4 py-20 flex-1 text-center">
          <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
          <h1 className="text-xl font-extrabold text-slate-800">Your cart is empty</h1>
          <p className="text-sm text-slate-500 mt-2">Add products before starting checkout.</p>
          <Link
            to="/customer/products"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl"
          >
            Browse products <ArrowRight size={14} />
          </Link>
        </div>
        <CustomerFooter />
      </div>
    );
  }

  const validateShipping = () => {
    const errors = {};
    if (!shipping.street.trim()) errors.street = 'Street is required';
    if (!shipping.city.trim()) errors.city = 'City is required';
    if (!shipping.country.trim()) errors.country = 'Country is required';
    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContinueFromShipping = () => {
    if (!validateShipping()) {
      toast.error('Please complete the required shipping fields');
      return;
    }
    setStep(2);
  };

  const handlePlaceOrder = async () => {
    if (!validateShipping()) {
      setStep(1);
      toast.error('Please complete shipping details');
      return;
    }
    // Opened synchronously within the click gesture so popup blockers allow it;
    // the wa.me URL is only known after the order API call succeeds.
    const isBankTransfer = paymentMethod === 'bank_transfer';
    const waTab = isBankTransfer ? window.open('', '_blank') : null;
    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((i) => ({ id: i.id, qty: i.qty })),
        couponCode: getStoredCouponCode() || undefined,
        shippingAddress: {
          street: shipping.street.trim(),
          city: shipping.city.trim(),
          state: shipping.state.trim(),
          postalCode: shipping.postalCode.trim(),
          country: shipping.country.trim()
        },
        paymentMethod,
        customerNote: customerNote.trim() || undefined,
        saveAddressToProfile: saveAddress
      };
      const data = await storefrontService.placeOrder(payload);
      if (isBankTransfer) {
        const waUrl = buildWhatsAppUrl({
          orderNumber: data.order.orderNumber,
          cart,
          estimate,
          customer: customerUser,
          shipping
        });
        if (waTab && !waTab.closed) {
          waTab.location.href = waUrl;
        } else {
          window.open(waUrl, '_blank');
        }
      }
      clearCart();
      clearStoredCouponCode();
      if (saveAddress) {
        try {
          const me = await customerAuthService.getCurrentCustomer();
          if (me?.customer) setCustomerUser(me.customer);
        } catch {
          /* ignore refresh failure */
        }
      }
      toast.success(`Order ${data.order.orderNumber} placed`);
      navigate(`/customer/orders/${data.order.id}`, { state: { justPlaced: true } });
    } catch (err) {
      if (waTab && !waTab.closed) waTab.close();
      toast.error(err.response?.data?.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 ${
      shippingErrors[field] ? 'border-rose-300' : 'border-slate-200'
    }`;

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

      <div className="max-w-3xl mx-auto px-4 pb-12 flex-1 w-full">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingBag size={20} className="text-teal-600" />
          <h1 className="text-xl font-extrabold text-slate-800">Checkout</h1>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, idx) => (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => s.id < step && setStep(s.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  step === s.id
                    ? 'bg-teal-600 text-white'
                    : step > s.id
                      ? 'bg-teal-50 text-teal-700'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  {step > s.id ? <Check size={12} /> : s.id}
                </span>
                {s.label}
              </button>
              {idx < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 max-w-8" />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <MapPin size={15} className="text-teal-600" /> Shipping details
            </h2>
            <p className="text-xs text-slate-400">
              Shipping to {customerUser?.firstName} {customerUser?.lastName}
              {customerUser?.email ? ` · ${customerUser.email}` : ''}
            </p>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Street *</label>
              <input
                className={inputClass('street')}
                value={shipping.street}
                onChange={(e) => setShipping((s) => ({ ...s, street: e.target.value }))}
                placeholder="Street address"
              />
              {shippingErrors.street && <p className="text-xs text-rose-500 mt-1">{shippingErrors.street}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">City *</label>
                <input
                  className={inputClass('city')}
                  value={shipping.city}
                  onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                />
                {shippingErrors.city && <p className="text-xs text-rose-500 mt-1">{shippingErrors.city}</p>}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">State / Province</label>
                <input
                  className={inputClass('state')}
                  value={shipping.state}
                  onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Postal code</label>
                <input
                  className={inputClass('postalCode')}
                  value={shipping.postalCode}
                  onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Country *</label>
                <input
                  className={inputClass('country')}
                  value={shipping.country}
                  onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
                />
                {shippingErrors.country && <p className="text-xs text-rose-500 mt-1">{shippingErrors.country}</p>}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Save to my profile
            </label>
            <div className="flex justify-between pt-2">
              <Link to="/customer/cart" className="text-sm font-bold text-slate-500 hover:text-teal-600 flex items-center gap-1">
                <ArrowLeft size={14} /> Back to cart
              </Link>
              <button
                type="button"
                onClick={handleContinueFromShipping}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl flex items-center gap-2"
              >
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-3">
              <h2 className="font-extrabold text-slate-800 text-sm">Order review</h2>
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 py-3 border-b border-slate-50 last:border-0">
                  <div className="w-14 h-14 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 overflow-hidden shrink-0">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={18} className="text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 line-clamp-2">{item.name}</p>
                    <p className="text-xs text-slate-400">Qty {item.qty}</p>
                  </div>
                  <p className="text-sm font-extrabold text-slate-800">
                    {formatPrice(item.sellingPrice * item.qty, item.currency)}
                  </p>
                </div>
              ))}
              <div className="space-y-1.5 text-sm pt-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(estimate.subtotal, estimate.currency)}</span>
                </div>
                {estimate.discount > 0 && (
                  <div className="flex justify-between text-teal-600">
                    <span>Discount {estimate.coupon ? `(${estimate.coupon.code})` : ''}</span>
                    <span>−{formatPrice(estimate.discount, estimate.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span>{estimate.shipping === 0 ? 'Free' : formatPrice(estimate.shipping, estimate.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>{formatPrice(estimate.tax, estimate.currency)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total</span>
                  <span className="flex items-center gap-1.5">
                    {estimating && <Loader2 size={14} className="animate-spin text-teal-500" />}
                    {formatPrice(estimate.total, estimate.currency)}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Order note (optional)</label>
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Delivery instructions or notes for your order"
                className="mt-1 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
              />
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-bold text-slate-500 hover:text-teal-600 flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl flex items-center gap-2"
              >
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-3">
              <h2 className="font-extrabold text-slate-800 text-sm">Payment method</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                We accept payment by bank transfer. After placing your order, transfer the total to
                the account below and send the payment receipt to our WhatsApp number.
              </p>
              {PAYMENT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${
                      selected
                        ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-500/20'
                        : 'border-slate-200 hover:border-teal-200'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${selected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{opt.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
              {paymentMethod === 'bank_transfer' && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Bank transfer instructions</p>
                  <p>Pay to: <span className="font-bold text-slate-800">{BANK_DETAILS.payTo}</span></p>
                  <p>Bank: <span className="font-bold text-slate-800">{BANK_DETAILS.bank}</span></p>
                  <p>Account No: <span className="font-bold text-slate-800">{BANK_DETAILS.accountNo}</span></p>
                  <p>Use your order number as the payment reference after placing the order.</p>
                  <p>
                    After paying, please send the payment receipt to WhatsApp{' '}
                    <span className="font-bold text-slate-800">{WHATSAPP_DISPLAY}</span>. Your order
                    details will open in WhatsApp automatically after you place the order.
                  </p>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-400">Order total</p>
                <p className="text-lg font-extrabold text-slate-900">
                  {formatPrice(estimate.total, estimate.currency)}
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={handlePlaceOrder}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl flex items-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                Place order
              </button>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm font-bold text-slate-500 hover:text-teal-600 flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>
        )}
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerCheckout;
