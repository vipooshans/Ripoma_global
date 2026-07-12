import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Globe,
  Save,
  Package,
  CreditCard,
  Bell,
  Heart,
  LayoutDashboard,
  ArrowRight,
  Download,
  ShoppingCart,
  Trash2,
  Copy,
  Loader2,
  Monitor,
  LogOut
} from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import { useStorefront } from '../../components/storefront/CustomerStorefrontLayout';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import customerAuthService from '../../services/customerAuth.service';
import storefrontService from '../../services/storefront.service';
import { formatPrice } from '../../utils/formatPrice';
import {
  getWishlist,
  getWishlistCount,
  removeFromWishlist,
  moveWishlistItemToCart
} from '../../utils/wishlist';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'security', label: 'Security', icon: Lock }
];

const OPEN_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'cancellation_requested'];

const personalSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  companyDetails: z.string().optional()
});

const addressFields = {
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional()
};

const addressesSchema = z.object({
  shipStreet: addressFields.street,
  shipCity: addressFields.city,
  shipState: addressFields.state,
  shipPostalCode: addressFields.postalCode,
  shipCountry: addressFields.country,
  billStreet: addressFields.street,
  billCity: addressFields.city,
  billState: addressFields.state,
  billPostalCode: addressFields.postalCode,
  billCountry: addressFields.country
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Must include a letter')
      .regex(/[0-9]/, 'Must include a number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password')
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

const ProfileSection = ({ title, icon: Icon, children, action }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-teal-600" />
        <h3 className="font-extrabold text-slate-800 text-sm">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const statusClass = (status) => {
  const map = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
    processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    shipped: 'bg-teal-50 text-teal-700 border-teal-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
    cancellation_requested: 'bg-orange-50 text-orange-700 border-orange-200'
  };
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
};

const statusLabel = (status) =>
  String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const paymentMethodLabel = (method) => {
  const map = {
    cod: 'Cash on delivery',
    bank_transfer: 'Bank transfer',
    card_mock: 'Card'
  };
  return map[method] || method || '—';
};

const isAddressComplete = (addr) =>
  Boolean(addr?.street?.trim() && addr?.city?.trim() && addr?.country?.trim());

const emptyAddress = () => ({
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: ''
});

const CustomerProfile = () => {
  const { customerUser, setCustomerUser, logout } = useContext(CustomerAuthContext);
  const { setCartOpen } = useStorefront();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.id === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'overview';

  const setTab = (id) => {
    setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true });
  };

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [wishlist, setWishlist] = useState(getWishlist);
  const [personalSubmitting, setPersonalSubmitting] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const prefs = {
    orderUpdates: customerUser?.notificationPrefs?.orderUpdates ?? true,
    shipmentUpdates: customerUser?.notificationPrefs?.shipmentUpdates ?? true,
    paymentUpdates: customerUser?.notificationPrefs?.paymentUpdates ?? true,
    reminders: customerUser?.notificationPrefs?.reminders ?? true,
    marketing: customerUser?.notificationPrefs?.marketing ?? false,
    channels: {
      email: customerUser?.notificationPrefs?.channels?.email ?? true,
      sms: customerUser?.notificationPrefs?.channels?.sms ?? false,
      inApp: customerUser?.notificationPrefs?.channels?.inApp ?? true
    }
  };

  const {
    register: regPersonal,
    handleSubmit: handlePersonal,
    reset: resetPersonal,
    formState: { errors: personalErrors }
  } = useForm({ resolver: zodResolver(personalSchema) });

  const {
    register: regAddr,
    handleSubmit: handleAddr,
    reset: resetAddr,
    getValues: getAddrValues,
    setValue: setAddrValue
  } = useForm({ resolver: zodResolver(addressesSchema) });

  const {
    register: regPw,
    handleSubmit: handlePw,
    reset: resetPw,
    formState: { errors: pwErrors }
  } = useForm({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    if (!customerUser) return;
    resetPersonal({
      firstName: customerUser.firstName || '',
      lastName: customerUser.lastName || '',
      phone: customerUser.phone || '',
      companyName: customerUser.companyName || '',
      companyDetails: customerUser.companyDetails || ''
    });
    const ship = customerUser.shippingAddress || emptyAddress();
    const bill = customerUser.billingAddress || emptyAddress();
    resetAddr({
      shipStreet: ship.street || '',
      shipCity: ship.city || '',
      shipState: ship.state || '',
      shipPostalCode: ship.postalCode || '',
      shipCountry: ship.country || '',
      billStreet: bill.street || '',
      billCity: bill.city || '',
      billState: bill.state || '',
      billPostalCode: bill.postalCode || '',
      billCountry: bill.country || ''
    });
  }, [customerUser, resetPersonal, resetAddr]);

  useEffect(() => {
    const sync = () => setWishlist(getWishlist());
    window.addEventListener('wishlist-updated', sync);
    return () => window.removeEventListener('wishlist-updated', sync);
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await storefrontService.getMyOrders();
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const data = await storefrontService.getMyNotifications(40);
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadNotifications();
  }, [loadOrders, loadNotifications]);

  const openOrderCount = useMemo(
    () => orders.filter((o) => OPEN_STATUSES.includes(o.orderStatus)).length,
    [orders]
  );
  const onPersonalSubmit = async (data) => {
    try {
      setPersonalSubmitting(true);
      const res = await customerAuthService.updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        companyName: data.companyName,
        companyDetails: data.companyDetails
      });
      setCustomerUser(res.customer);
      toast.success('Personal info updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setPersonalSubmitting(false);
    }
  };

  const onAddressSubmit = async (data) => {
    try {
      setAddressSubmitting(true);
      const res = await customerAuthService.updateProfile({
        shippingAddress: {
          street: data.shipStreet,
          city: data.shipCity,
          state: data.shipState,
          postalCode: data.shipPostalCode,
          country: data.shipCountry
        },
        billingAddress: {
          street: data.billStreet,
          city: data.billCity,
          state: data.billState,
          postalCode: data.billPostalCode,
          country: data.billCountry
        }
      });
      setCustomerUser(res.customer);
      toast.success('Addresses saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save addresses.');
    } finally {
      setAddressSubmitting(false);
    }
  };

  const copyShippingToBilling = () => {
    const v = getAddrValues();
    setAddrValue('billStreet', v.shipStreet || '');
    setAddrValue('billCity', v.shipCity || '');
    setAddrValue('billState', v.shipState || '');
    setAddrValue('billPostalCode', v.shipPostalCode || '');
    setAddrValue('billCountry', v.shipCountry || '');
    toast.success('Copied shipping to billing');
  };

  const onPasswordSubmit = async (data) => {
    try {
      setPasswordSubmitting(true);
      const res = await customerAuthService.changePassword(data.currentPassword, data.newPassword);
      toast.success(res.message || 'Password changed successfully');
      resetPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (res.requireReauth) {
        await logout();
        navigate('/customer/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect current password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await customerAuthService.listSessions();
      setSessions(data.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'security') loadSessions();
  }, [activeTab, loadSessions]);

  const handleLogoutAll = async () => {
    setSessionBusy(true);
    try {
      await customerAuthService.logoutAllSessions();
      toast.success('Signed out of all devices');
      await logout();
      navigate('/customer/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not sign out all sessions');
    } finally {
      setSessionBusy(false);
    }
  };

  const handleRevokeSession = async (id) => {
    setSessionBusy(true);
    try {
      const res = await customerAuthService.revokeSession(id);
      toast.success(res.message || 'Session revoked');
      if (res.requireReauth) {
        await logout();
        navigate('/customer/login');
        return;
      }
      await loadSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not revoke session');
    } finally {
      setSessionBusy(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await customerAuthService.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ripoma-account-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    setDeleting(true);
    try {
      await customerAuthService.deleteMyAccount(deletePassword, 'DELETE');
      toast.success('Account deleted');
      await logout();
      navigate('/customer');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete account');
    } finally {
      setDeleting(false);
    }
  };

  const savePrefs = async (next) => {
    try {
      setPrefsSaving(true);
      const res = await customerAuthService.updateProfile({ notificationPrefs: next });
      setCustomerUser(res.customer);
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save preferences.');
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleResendVerification = async () => {
    if (!customerUser?.email) return;
    try {
      setResendingVerification(true);
      await customerAuthService.resendVerification(customerUser.email);
      toast.success('Verification email sent.');
    } catch {
      toast.error('Could not resend verification email.');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleInvoice = async (order) => {
    try {
      setDownloadingId(order.id);
      await storefrontService.downloadOrderInvoice(order.id, order.orderNumber);
    } catch {
      toast.error('Could not download invoice.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleWishMove = (id) => {
    moveWishlistItemToCart(id);
    setWishlist(getWishlist());
    toast.success('Moved to cart');
    setCartOpen(true);
  };

  const handleWishRemove = (id) => {
    removeFromWishlist(id);
    setWishlist(getWishlist());
    toast.success('Removed from wishlist');
  };

  const initials = customerUser
    ? `${customerUser.firstName?.charAt(0) || ''}${customerUser.lastName?.charAt(0) || ''}`
    : 'C';

  const wishlistCount = getWishlistCount(wishlist);
  const shipComplete = isAddressComplete(customerUser?.shippingAddress);
  const recentOrders = orders.slice(0, 8);

  const inputClass =
    'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400';
  const labelClass = 'block text-xs font-bold text-slate-500 mb-1';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Account</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage your profile, addresses, orders, payments, notifications, and wishlist.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-56 shrink-0 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-extrabold shrink-0">
                {initials.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-slate-800 truncate">
                  {customerUser?.firstName} {customerUser?.lastName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{customerUser?.email}</p>
              </div>
            </div>

            <nav className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hidden lg:block">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold border-b border-slate-50 last:border-0 transition-colors ${
                      active
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={15} className={active ? 'text-teal-600' : 'text-slate-400'} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTab(tab.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      active
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main panel */}
          <div className="flex-1 min-w-0 space-y-5">
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Orders', value: ordersLoading ? '—' : orders.length, tab: 'orders', icon: Package },
                    { label: 'Open', value: ordersLoading ? '—' : openOrderCount, tab: 'orders', icon: Package },
                    { label: 'Wishlist', value: wishlistCount, tab: 'wishlist', icon: Heart },
                    {
                      label: 'Shipping',
                      value: shipComplete ? 'Set' : 'Incomplete',
                      tab: 'addresses',
                      icon: MapPin
                    }
                  ].map((card) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.label}
                        type="button"
                        onClick={() => setTab(card.tab)}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-left hover:border-teal-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {card.label}
                          </span>
                          <Icon size={14} className="text-teal-500" />
                        </div>
                        <p className="text-xl font-extrabold text-slate-900">{card.value}</p>
                      </button>
                    );
                  })}
                </div>

                <ProfileSection title="Account snapshot" icon={User}>
                  <div className="flex flex-wrap items-start gap-6">
                    <div className="space-y-2 text-sm text-slate-600 flex-1 min-w-[200px]">
                      {customerUser?.emailVerified ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                          <CheckCircle2 size={11} /> Email verified
                        </span>
                      ) : (
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                            <AlertCircle size={11} /> Email not verified
                          </span>
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resendingVerification}
                            className="block text-[11px] font-bold text-teal-600 hover:text-teal-700 disabled:opacity-50"
                          >
                            {resendingVerification ? 'Sending…' : 'Resend verification email'}
                          </button>
                        </div>
                      )}
                      {customerUser?.phone && (
                        <p className="flex items-center gap-2">
                          <Phone size={13} className="text-teal-500" /> {customerUser.phone}
                        </p>
                      )}
                      {customerUser?.companyName && (
                        <p className="flex items-center gap-2">
                          <Building2 size={13} className="text-teal-500" /> {customerUser.companyName}
                        </p>
                      )}
                      {customerUser?.shippingAddress?.country && (
                        <p className="flex items-center gap-2">
                          <Globe size={13} className="text-teal-500" />
                          {[customerUser.shippingAddress.city, customerUser.shippingAddress.country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setTab('personal')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        Edit personal info <ArrowRight size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('orders')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        View orders <ArrowRight size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('notifications')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        Notifications <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </ProfileSection>

                <ProfileSection
                  title="Recent activity"
                  icon={Bell}
                  action={
                    <button
                      type="button"
                      onClick={() => setTab('notifications')}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700"
                    >
                      See all
                    </button>
                  }
                >
                  {notificationsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-teal-500" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-sm text-slate-500">No recent alerts yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {notifications.slice(0, 5).map((n) => (
                        <li key={n.id} className="flex items-start justify-between gap-3 text-sm">
                          <div>
                            <p className="font-semibold text-slate-800">{n.title}</p>
                            {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">
                              {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                            </p>
                          </div>
                          {n.actionUrl && (
                            <Link to={n.actionUrl} className="text-xs font-bold text-teal-600 shrink-0">
                              View
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </ProfileSection>
              </>
            )}

            {activeTab === 'personal' && (
              <ProfileSection title="Personal & company information" icon={User}>
                <form onSubmit={handlePersonal(onPersonalSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>First name</label>
                      <input
                        type="text"
                        className={`${inputClass} ${personalErrors.firstName ? 'border-rose-500' : ''}`}
                        {...regPersonal('firstName')}
                      />
                      {personalErrors.firstName && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">
                          {personalErrors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Last name</label>
                      <input
                        type="text"
                        className={`${inputClass} ${personalErrors.lastName ? 'border-rose-500' : ''}`}
                        {...regPersonal('lastName')}
                      />
                      {personalErrors.lastName && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">
                          {personalErrors.lastName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Phone</label>
                      <input type="tel" className={inputClass} placeholder="+1 (555) 000-0000" {...regPersonal('phone')} />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          className={`${inputClass} pl-9 bg-slate-50 text-slate-500 cursor-not-allowed`}
                          value={customerUser?.email || ''}
                          disabled
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed.</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Company name</label>
                      <input type="text" className={inputClass} placeholder="Optional" {...regPersonal('companyName')} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Company details</label>
                      <textarea
                        className={inputClass}
                        rows={2}
                        placeholder="Brief description of your business..."
                        {...regPersonal('companyDetails')}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={personalSubmitting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                    >
                      {personalSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save changes
                    </button>
                  </div>
                </form>
              </ProfileSection>
            )}

            {activeTab === 'addresses' && (
              <form onSubmit={handleAddr(onAddressSubmit)} className="space-y-5">
                <ProfileSection title="Shipping address" icon={MapPin}>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Street</label>
                      <input type="text" className={inputClass} {...regAddr('shipStreet')} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>City</label>
                        <input type="text" className={inputClass} {...regAddr('shipCity')} />
                      </div>
                      <div>
                        <label className={labelClass}>State / region</label>
                        <input type="text" className={inputClass} {...regAddr('shipState')} />
                      </div>
                      <div>
                        <label className={labelClass}>Postal code</label>
                        <input type="text" className={inputClass} {...regAddr('shipPostalCode')} />
                      </div>
                      <div>
                        <label className={labelClass}>Country</label>
                        <input type="text" className={inputClass} {...regAddr('shipCountry')} />
                      </div>
                    </div>
                  </div>
                </ProfileSection>

                <ProfileSection
                  title="Billing address"
                  icon={CreditCard}
                  action={
                    <button
                      type="button"
                      onClick={copyShippingToBilling}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
                    >
                      <Copy size={12} /> Copy shipping → billing
                    </button>
                  }
                >
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Street</label>
                      <input type="text" className={inputClass} {...regAddr('billStreet')} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>City</label>
                        <input type="text" className={inputClass} {...regAddr('billCity')} />
                      </div>
                      <div>
                        <label className={labelClass}>State / region</label>
                        <input type="text" className={inputClass} {...regAddr('billState')} />
                      </div>
                      <div>
                        <label className={labelClass}>Postal code</label>
                        <input type="text" className={inputClass} {...regAddr('billPostalCode')} />
                      </div>
                      <div>
                        <label className={labelClass}>Country</label>
                        <input type="text" className={inputClass} {...regAddr('billCountry')} />
                      </div>
                    </div>
                  </div>
                </ProfileSection>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addressSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                  >
                    {addressSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save addresses
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'orders' && (
              <ProfileSection
                title="Recent orders"
                icon={Package}
                action={
                  <Link to="/customer/orders" className="text-xs font-bold text-teal-600 hover:text-teal-700">
                    View all orders
                  </Link>
                }
              >
                {ordersLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={22} className="animate-spin text-teal-500" />
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500 mb-3">You have not placed any orders yet.</p>
                    <Link
                      to="/customer/products"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600"
                    >
                      Browse products <ArrowRight size={12} />
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {recentOrders.map((order) => (
                      <li key={order.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <Link
                            to={`/customer/orders/${order.id}`}
                            className="text-sm font-bold text-slate-800 hover:text-teal-700"
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {order.placedAt ? new Date(order.placedAt).toLocaleDateString() : '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-extrabold text-slate-900">
                            {formatPrice(order.grandTotal, order.currency)}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusClass(order.orderStatus)}`}
                          >
                            {statusLabel(order.orderStatus)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </ProfileSection>
            )}

            {activeTab === 'payments' && (
              <ProfileSection title="Payment history" icon={CreditCard}>
                {ordersLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={22} className="animate-spin text-teal-500" />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-slate-500">No payments yet — place an order to see history here.</p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm text-left min-w-[560px]">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          <th className="px-2 py-2 font-bold">Date</th>
                          <th className="px-2 py-2 font-bold">Order</th>
                          <th className="px-2 py-2 font-bold">Method</th>
                          <th className="px-2 py-2 font-bold">Status</th>
                          <th className="px-2 py-2 font-bold text-right">Amount</th>
                          <th className="px-2 py-2 font-bold text-right">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b border-slate-50">
                            <td className="px-2 py-3 text-slate-600 whitespace-nowrap">
                              {order.placedAt ? new Date(order.placedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-2 py-3">
                              <Link
                                to={`/customer/orders/${order.id}`}
                                className="font-bold text-slate-800 hover:text-teal-700"
                              >
                                {order.orderNumber}
                              </Link>
                            </td>
                            <td className="px-2 py-3 text-slate-600">
                              {paymentMethodLabel(order.paymentMethod)}
                            </td>
                            <td className="px-2 py-3">
                              <span className="text-[10px] font-bold uppercase text-slate-600">
                                {statusLabel(order.paymentStatus)}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-right font-extrabold text-slate-900">
                              {formatPrice(order.grandTotal, order.currency)}
                            </td>
                            <td className="px-2 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleInvoice(order)}
                                disabled={downloadingId === order.id}
                                className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 disabled:opacity-50"
                              >
                                {downloadingId === order.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Download size={12} />
                                )}
                                PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ProfileSection>
            )}

            {activeTab === 'notifications' && (
              <>
                <ProfileSection title="Notification preferences" icon={Bell}>
                  <div className="space-y-4">
                    {[
                      {
                        key: 'orderUpdates',
                        label: 'Order updates',
                        desc: 'Placed, confirmed, cancelled, and other status changes'
                      },
                      {
                        key: 'shipmentUpdates',
                        label: 'Shipment updates',
                        desc: 'Carrier notes, tracking, and delivery messages'
                      },
                      {
                        key: 'paymentUpdates',
                        label: 'Payment updates',
                        desc: 'Payment status changes on your orders'
                      },
                      {
                        key: 'reminders',
                        label: 'Reminders',
                        desc: 'Payment due and upcoming delivery reminders'
                      },
                      {
                        key: 'marketing',
                        label: 'Promotions',
                        desc: 'Marketing offers and product news'
                      }
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start justify-between gap-4 cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          checked={Boolean(prefs[item.key])}
                          disabled={prefsSaving}
                          onChange={(e) =>
                            savePrefs({
                              ...prefs,
                              [item.key]: e.target.checked
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </ProfileSection>

                <ProfileSection title="Delivery channels" icon={Bell}>
                  <div className="space-y-4">
                    {[
                      { key: 'inApp', label: 'In-system', desc: 'Show alerts in your account and navbar bell' },
                      { key: 'email', label: 'Email', desc: 'Send alerts to your account email' },
                      { key: 'sms', label: 'SMS', desc: 'Text alerts to your phone (stub until SMS provider is configured)' }
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start justify-between gap-4 cursor-pointer"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          checked={Boolean(prefs.channels[item.key])}
                          disabled={prefsSaving}
                          onChange={(e) =>
                            savePrefs({
                              ...prefs,
                              channels: {
                                ...prefs.channels,
                                [item.key]: e.target.checked
                              }
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </ProfileSection>

                <ProfileSection
                  title="Inbox"
                  icon={Bell}
                  action={
                    notifications.some((n) => !n.isRead) ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await storefrontService.markAllNotificationsRead();
                            setNotifications((list) =>
                              list.map((n) => ({ ...n, isRead: true }))
                            );
                            toast.success('All marked as read');
                          } catch {
                            toast.error('Could not mark notifications read');
                          }
                        }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700"
                      >
                        Mark all read
                      </button>
                    ) : null
                  }
                >
                  {notificationsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-teal-500" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No notifications yet. Place an order or wait for shipment updates.
                    </p>
                  ) : (
                    <ul className="space-y-4">
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          className={`flex gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0 ${
                            !n.isRead ? 'bg-teal-50/30 -mx-2 px-2 rounded-lg' : ''
                          }`}
                        >
                          <div
                            className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              n.type === 'shipment_update'
                                ? 'bg-teal-50 text-teal-600'
                                : n.type === 'promotion'
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {n.type === 'shipment_update' ? <Package size={14} /> : <Bell size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                            {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
                            <p className="text-[10px] text-slate-400 mt-1">
                              {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                            </p>
                          </div>
                          {n.actionUrl && (
                            <Link
                              to={n.actionUrl}
                              onClick={async () => {
                                if (!n.isRead) {
                                  try {
                                    await storefrontService.markNotificationRead(n.id);
                                    setNotifications((list) =>
                                      list.map((x) =>
                                        x.id === n.id ? { ...x, isRead: true } : x
                                      )
                                    );
                                  } catch {
                                    /* ignore */
                                  }
                                }
                              }}
                              className="text-xs font-bold text-teal-600 shrink-0 self-start"
                            >
                              View
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </ProfileSection>
              </>
            )}

            {activeTab === 'wishlist' && (
              <ProfileSection
                title="Wishlist"
                icon={Heart}
                action={
                  <Link to="/customer/wishlist" className="text-xs font-bold text-teal-600 hover:text-teal-700">
                    Open full wishlist
                  </Link>
                }
              >
                {wishlist.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart size={28} className="text-rose-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-3">No saved products yet.</p>
                    <Link
                      to="/customer/products"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600"
                    >
                      Browse products <ArrowRight size={12} />
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {wishlist.slice(0, 10).map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50"
                      >
                        <Link
                          to={`/customer/products/${item.id}`}
                          className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0"
                        >
                          {item.images?.[0] ? (
                            <img src={item.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package size={18} className="text-slate-300" />
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/customer/products/${item.id}`}
                            className="text-sm font-bold text-slate-800 hover:text-teal-700 line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          <p className="text-xs font-extrabold text-teal-600 mt-0.5">
                            {formatPrice(item.sellingPrice, item.currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleWishMove(item.id)}
                            className="p-2 rounded-lg text-teal-600 hover:bg-teal-50"
                            aria-label="Add to cart"
                          >
                            <ShoppingCart size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWishRemove(item.id)}
                            className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                            aria-label="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </ProfileSection>
            )}

            {activeTab === 'security' && (
              <div className="space-y-5">
                <ProfileSection title="Session & login" icon={Monitor}>
                  <p className="text-sm text-slate-500 mb-4">
                    Last sign-in:{' '}
                    <span className="font-semibold text-slate-700">
                      {customerUser?.lastLogin
                        ? new Date(customerUser.lastLogin).toLocaleString()
                        : '—'}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Active devices
                    </p>
                    <button
                      type="button"
                      disabled={sessionBusy}
                      onClick={handleLogoutAll}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                    >
                      <LogOut size={13} /> Sign out all devices
                    </button>
                  </div>
                  {sessionsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="animate-spin text-teal-600" size={22} />
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-sm text-slate-400">No active sessions found.</p>
                  ) : (
                    <ul className="space-y-2">
                      {sessions.map((s) => (
                        <li
                          key={s.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {s.userAgent || 'Unknown device'}
                              {s.current && (
                                <span className="ml-2 text-[10px] font-bold uppercase text-teal-600">
                                  This device
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400">
                              {s.ip || 'IP unknown'} · Active{' '}
                              {s.lastActiveAt
                                ? new Date(s.lastActiveAt).toLocaleString()
                                : '—'}
                            </p>
                          </div>
                          {!s.current && (
                            <button
                              type="button"
                              disabled={sessionBusy}
                              onClick={() => handleRevokeSession(s.id)}
                              className="text-xs font-bold text-slate-500 hover:text-rose-600"
                            >
                              Revoke
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </ProfileSection>

                <ProfileSection title="Change password" icon={Lock}>
                  <form onSubmit={handlePw(onPasswordSubmit)} className="space-y-4 max-w-xl">
                    <p className="text-xs text-slate-500">
                      Use at least 8 characters with a letter and a number. Changing your password
                      signs you out everywhere.
                    </p>
                    <div>
                      <label className={labelClass}>Current password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          className={`${inputClass} pr-9 ${pwErrors.currentPassword ? 'border-rose-500' : ''}`}
                          {...regPw('currentPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {pwErrors.currentPassword && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">
                          {pwErrors.currentPassword.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>New password</label>
                      <div className="relative">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          className={`${inputClass} pr-9 ${pwErrors.newPassword ? 'border-rose-500' : ''}`}
                          placeholder="Letter + number, min 8"
                          {...regPw('newPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {pwErrors.newPassword && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">
                          {pwErrors.newPassword.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Confirm new password</label>
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        className={`${inputClass} ${pwErrors.confirmPassword ? 'border-rose-500' : ''}`}
                        {...regPw('confirmPassword')}
                      />
                      {pwErrors.confirmPassword && (
                        <p className="text-rose-500 text-xs mt-1 font-semibold">
                          {pwErrors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={passwordSubmitting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                      >
                        {passwordSubmitting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={14} />
                        )}
                        Update password
                      </button>
                    </div>
                  </form>
                </ProfileSection>

                <ProfileSection title="Privacy & data" icon={Download}>
                  <div className="space-y-4 max-w-xl">
                    <p className="text-sm text-slate-500">
                      Download a copy of your account, orders, and support history, or permanently
                      close your account.
                    </p>
                    <button
                      type="button"
                      disabled={exporting}
                      onClick={handleExportData}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      Export my data
                    </button>
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-500">
                        Delete account
                      </p>
                      <input
                        type="password"
                        placeholder="Confirm with your password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder='Type DELETE to confirm'
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        className={inputClass}
                      />
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={handleDeleteAccount}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                      >
                        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete my account
                      </button>
                    </div>
                  </div>
                </ProfileSection>
              </div>
            )}
          </div>
        </div>
      </div>
      <CustomerFooter />
    </div>
  );
};

export default CustomerProfile;
