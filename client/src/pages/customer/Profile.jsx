import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import customerAuthService from '../../services/customerAuth.service';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Globe,
  Edit2,
  Save,
  ArrowLeft
} from 'lucide-react';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  companyDetails: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional()
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password')
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

// ─── Profile Section ──────────────────────────────────────────────────────────
const ProfileSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
      <Icon size={16} className="text-teal-600" />
      <h3 className="font-extrabold text-slate-800 text-sm">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const CustomerProfile = () => {
  const { customerUser, setCustomerUser, logout } = useContext(CustomerAuthContext);
  const navigate = useNavigate();
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Profile form
  const {
    register: regProfile,
    handleSubmit: handleProfile,
    reset: resetProfile,
    formState: { errors: profileErrors }
  } = useForm({ resolver: zodResolver(profileSchema) });

  // Password form
  const {
    register: regPw,
    handleSubmit: handlePw,
    reset: resetPw,
    formState: { errors: pwErrors }
  } = useForm({ resolver: zodResolver(passwordSchema) });

  // Populate form when user loads
  useEffect(() => {
    if (customerUser) {
      resetProfile({
        firstName: customerUser.firstName || '',
        lastName: customerUser.lastName || '',
        phone: customerUser.phone || '',
        companyName: customerUser.companyName || '',
        companyDetails: customerUser.companyDetails || '',
        street: customerUser.shippingAddress?.street || '',
        city: customerUser.shippingAddress?.city || '',
        state: customerUser.shippingAddress?.state || '',
        postalCode: customerUser.shippingAddress?.postalCode || '',
        country: customerUser.shippingAddress?.country || ''
      });
    }
  }, [customerUser, resetProfile]);

  const onProfileSubmit = async (data) => {
    try {
      setProfileSubmitting(true);
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        companyName: data.companyName,
        companyDetails: data.companyDetails,
        shippingAddress: {
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country
        }
      };
      const res = await customerAuthService.updateProfile(payload);
      setCustomerUser(res.customer);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    try {
      setPasswordSubmitting(true);
      await customerAuthService.changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed successfully!');
      resetPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect current password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('You have been logged out.');
    navigate('/customer/login');
  };

  const handleResendVerification = async () => {
    if (!customerUser?.email) return;
    try {
      setResendingVerification(true);
      await customerAuthService.resendVerification(customerUser.email);
      toast.success('Verification email sent. Please check your inbox.');
    } catch {
      toast.error('Could not resend verification email.');
    } finally {
      setResendingVerification(false);
    }
  };

  const initials = customerUser
    ? `${customerUser.firstName?.charAt(0) || ''}${customerUser.lastName?.charAt(0) || ''}`
    : 'C';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500 text-slate-950 font-extrabold text-base shadow-sm">
              R
            </div>
            <div>
              <p className="text-sm font-extrabold tracking-wider leading-none text-slate-800">RIPOMA</p>
              <span className="text-[9px] text-teal-600 font-bold tracking-widest uppercase">CUSTOMER PORTAL</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-slate-500 font-medium">
              {customerUser?.email}
            </span>
            <button
              id="customer-logout-btn"
              onClick={handleLogout}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Profile</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage your personal information, address, and account security.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Avatar card */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
              {/* Avatar initials */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-teal-500/20 mb-4">
                {initials.toUpperCase()}
              </div>
              <h3 className="font-extrabold text-slate-800 text-base leading-tight">
                {customerUser?.firstName} {customerUser?.lastName}
              </h3>
              <span className="text-xs text-slate-500 mt-1">{customerUser?.email}</span>

              {/* Verification badge */}
              <div className="mt-3">
                {customerUser?.emailVerified ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                    <CheckCircle2 size={11} />
                    Email Verified
                  </span>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                      <AlertCircle size={11} />
                      Email Not Verified
                    </span>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="text-[11px] font-bold text-teal-600 hover:text-teal-700 disabled:opacity-50"
                    >
                      {resendingVerification ? 'Sending…' : 'Resend verification email'}
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Info */}
              <div className="w-full mt-5 pt-5 border-t border-slate-100 space-y-3 text-xs text-left">
                {customerUser?.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={13} className="text-teal-500 shrink-0" />
                    <span>{customerUser.phone}</span>
                  </div>
                )}
                {customerUser?.companyName && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 size={13} className="text-teal-500 shrink-0" />
                    <span className="font-medium">{customerUser.companyName}</span>
                  </div>
                )}
                {customerUser?.shippingAddress?.country && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Globe size={13} className="text-teal-500 shrink-0" />
                    <span>
                      {customerUser.shippingAddress.city
                        ? `${customerUser.shippingAddress.city}, `
                        : ''}
                      {customerUser.shippingAddress.country}
                    </span>
                  </div>
                )}
                {customerUser?.lastLogin && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <ShieldCheck size={13} className="shrink-0" />
                    <span>Last login: {new Date(customerUser.lastLogin).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Forms */}
          <div className="lg:col-span-2 space-y-5">
            {/* Profile Edit Form */}
            <ProfileSection title="Personal & Company Information" icon={Edit2}>
              <form onSubmit={handleProfile(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">First Name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="profile-firstname"
                        type="text"
                        className={`form-input pl-9 ${profileErrors.firstName ? 'border-rose-500' : ''}`}
                        {...regProfile('firstName')}
                      />
                    </div>
                    {profileErrors.firstName && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{profileErrors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Last Name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="profile-lastname"
                        type="text"
                        className={`form-input pl-9 ${profileErrors.lastName ? 'border-rose-500' : ''}`}
                        {...regProfile('lastName')}
                      />
                    </div>
                    {profileErrors.lastName && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{profileErrors.lastName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="profile-phone"
                        type="tel"
                        className="form-input pl-9"
                        placeholder="+1 (555) 000-0000"
                        {...regProfile('phone')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        className="form-input pl-9 bg-slate-50 text-slate-500 cursor-not-allowed"
                        value={customerUser?.email || ''}
                        disabled
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Company Name</label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="profile-company"
                        type="text"
                        className="form-input pl-9"
                        placeholder="Optional"
                        {...regProfile('companyName')}
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Company Details</label>
                    <textarea
                      id="profile-company-details"
                      className="form-input"
                      rows={2}
                      placeholder="Brief description of your business..."
                      {...regProfile('companyDetails')}
                    />
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MapPin size={12} className="text-teal-500" />
                    Shipping Address
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="form-label">Street</label>
                      <input id="profile-street" type="text" className="form-input" placeholder="123 Commerce St." {...regProfile('street')} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="form-label">City</label>
                        <input id="profile-city" type="text" className="form-input" {...regProfile('city')} />
                      </div>
                      <div>
                        <label className="form-label">State / Region</label>
                        <input id="profile-state" type="text" className="form-input" {...regProfile('state')} />
                      </div>
                      <div>
                        <label className="form-label">Postal Code</label>
                        <input id="profile-postal" type="text" className="form-input" {...regProfile('postalCode')} />
                      </div>
                      <div>
                        <label className="form-label">Country</label>
                        <div className="relative">
                          <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input id="profile-country" type="text" className="form-input pl-9" {...regProfile('country')} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    id="profile-save-btn"
                    type="submit"
                    disabled={profileSubmitting}
                    className="btn-primary py-2 px-5 text-xs"
                  >
                    {profileSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </ProfileSection>

            {/* Change Password */}
            <ProfileSection title="Change Password" icon={Lock}>
              <form onSubmit={handlePw(onPasswordSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Current Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="pw-current"
                        type={showCurrentPw ? 'text' : 'password'}
                        className={`form-input pl-9 pr-9 ${pwErrors.currentPassword ? 'border-rose-500' : ''}`}
                        placeholder="••••••••"
                        {...regPw('currentPassword')}
                      />
                      <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {pwErrors.currentPassword && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{pwErrors.currentPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">New Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="pw-new"
                        type={showNewPw ? 'text' : 'password'}
                        className={`form-input pl-9 pr-9 ${pwErrors.newPassword ? 'border-rose-500' : ''}`}
                        placeholder="Min. 8 chars"
                        {...regPw('newPassword')}
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {pwErrors.newPassword && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{pwErrors.newPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Confirm New Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="pw-confirm"
                        type={showNewPw ? 'text' : 'password'}
                        className={`form-input pl-9 ${pwErrors.confirmPassword ? 'border-rose-500' : ''}`}
                        placeholder="••••••••"
                        {...regPw('confirmPassword')}
                      />
                    </div>
                    {pwErrors.confirmPassword && (
                      <p className="text-rose-500 text-xs mt-1 font-semibold">{pwErrors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    id="pw-save-btn"
                    type="submit"
                    disabled={passwordSubmitting}
                    className="btn-primary py-2 px-5 text-xs"
                  >
                    {passwordSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </ProfileSection>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerProfile;
