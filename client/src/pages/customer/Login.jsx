import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import customerAuthService from '../../services/customerAuth.service';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Globe,
  ArrowRight,
  UserCircle,
  ShieldCheck
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const CustomerLogin = () => {
  const { login } = useContext(CustomerAuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resending, setResending] = useState(false);

  const from = location.state?.from?.pathname || '/customer/profile';

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur'
  });

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      setUnverifiedEmail(null);
      await login(data.email, data.password);
      toast.success('Welcome back! You are now logged in.');
      navigate(from, { replace: true });
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(data.email);
        toast.error(err.message);
      } else {
        toast.error(err.message || 'Invalid email or password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    try {
      setResending(true);
      await customerAuthService.resendVerification(unverifiedEmail);
      toast.success('Verification email sent. Please check your inbox.');
    } catch {
      toast.error('Could not resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 py-8">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[520px]">

        {/* Left Brand Panel */}
        <div className="md:w-5/12 bg-gradient-to-br from-slate-900 to-teal-900 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-teal-400/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

          {/* Logo */}
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500 text-slate-950 font-extrabold text-xl shadow-lg shadow-teal-500/30">
              R
            </div>
            <div>
              <p className="text-base font-extrabold tracking-wider leading-none">RIPOMA</p>
              <span className="text-[10px] text-teal-400 font-bold tracking-widest uppercase">GLOBAL</span>
            </div>
          </div>

          {/* Center content */}
          <div className="my-8 md:my-0 relative z-10">
            <div className="w-16 h-16 bg-teal-500/20 rounded-2xl flex items-center justify-center mb-6 border border-teal-500/30">
              <UserCircle className="w-9 h-9 text-teal-400" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
              Customer Portal
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Access your orders, manage your profile, and track your shipments with RIPOMA GLOBAL.
            </p>

            <div className="mt-6 space-y-3">
              {[
                'Track your orders in real time',
                'Manage shipping addresses',
                'View & download invoices'
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <ShieldCheck size={14} className="text-teal-400 shrink-0" />
                  <span className="text-xs text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-slate-500 relative z-10">
            © {new Date().getFullYear()} RIPOMA GLOBAL Inc. All rights reserved.
          </div>
        </div>

        {/* Right Login Form */}
        <div className="md:w-7/12 p-8 lg:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-xl lg:text-2xl font-extrabold text-slate-800">Welcome Back</h3>
            <p className="text-slate-500 text-sm mt-1">Sign in to your customer account.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {unverifiedEmail && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">Email not verified</p>
                <p className="mt-1 text-xs text-amber-700">
                  Check your inbox for the verification link, or request a new one.
                </p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="mt-2 text-xs font-bold text-teal-700 hover:text-teal-800 disabled:opacity-50"
                >
                  {resending ? 'Sending…' : 'Resend verification email'}
                </button>
              </div>
            )}
            {/* Email */}
            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  id="customer-login-email"
                  type="email"
                  className={`form-input pl-10 ${
                    errors.email ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : ''
                  }`}
                  placeholder="you@example.com"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="form-label mb-0">Password</label>
                <Link
                  to="/customer/forgot-password"
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  id="customer-login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input pl-10 pr-10 ${
                    errors.password ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : ''
                  }`}
                  placeholder="••••••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="customer-login-submit"
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link
                to="/customer/register"
                className="font-bold text-teal-600 hover:text-teal-700 transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-600 transition-colors"
            >
              <Globe size={12} />
              Staff / Admin Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
