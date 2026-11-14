import React, { useState, useContext, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import customerAuthService from '../../services/customerAuth.service';
import GoogleSignInButton from '../../components/customer/GoogleSignInButton';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Globe,
  ArrowRight,
  ShieldCheck,
  Package,
  Truck,
  FileText,
  Sparkles
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const highlights = [
  {
    icon: Package,
    title: 'Real-time tracking',
    text: 'Follow every order from warehouse to doorstep.'
  },
  {
    icon: Truck,
    title: 'Global logistics',
    text: 'Import & export shipments managed end to end.'
  },
  {
    icon: FileText,
    title: 'Instant invoices',
    text: 'View and download your documents anytime.'
  }
];

const CustomerLogin = () => {
  const { login, loginWithGoogle } = useContext(CustomerAuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
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

  const handleGoogleCredential = useCallback(
    async (credential) => {
      try {
        setGoogleSubmitting(true);
        await loginWithGoogle(credential);
        toast.success('Welcome! You are signed in with Google.');
        navigate(from, { replace: true });
      } catch (err) {
        toast.error(err.message || 'Google sign-in failed.');
      } finally {
        setGoogleSubmitting(false);
      }
    },
    [loginWithGoogle, navigate, from]
  );

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
    <div className="relative flex items-center justify-center min-h-screen bg-slate-950 px-3 sm:px-4 py-6 sm:py-10 overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 auth-grid-overlay" />
      <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] bg-teal-500/20 rounded-full blur-[120px] animate-auth-blob" />
      <div className="absolute -bottom-48 -right-32 w-[30rem] h-[30rem] bg-emerald-500/15 rounded-full blur-[120px] animate-auth-blob-slow" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] animate-auth-blob" />

      <div className="relative w-full max-w-5xl animate-auth-fade-up">
        {/* Gradient border wrapper */}
        <div className="rounded-3xl p-[1px] bg-gradient-to-br from-teal-400/40 via-slate-700/40 to-emerald-400/30 shadow-2xl shadow-black/40">
          <div className="rounded-3xl bg-white overflow-hidden flex flex-col md:flex-row min-h-[560px]">

            {/* ── Left Brand Panel ── */}
            <div className="md:w-[45%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              <div className="absolute inset-0 auth-grid-overlay opacity-60" />
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl animate-auth-blob" />
              <div className="absolute -bottom-20 -right-16 w-64 h-64 bg-emerald-400/15 rounded-full blur-3xl animate-auth-blob-slow" />

              {/* Logo */}
              <div className="relative z-10">
                <img
                  src="/logo-white.svg"
                  alt="RIPOMA GLOBAL TRADING (PVT) LTD"
                  className="h-16 w-auto -ml-2"
                />
              </div>

              {/* Center content */}
              <div className="my-6 md:my-0 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-300 text-[11px] font-bold uppercase tracking-widest mb-4 sm:mb-5">
                  <Sparkles size={12} />
                  Customer Portal
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold leading-tight">
                  Your trade, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">
                    beautifully managed.
                  </span>
                </h2>
                <p className="text-slate-400 text-sm mt-4 leading-relaxed max-w-xs">
                  Sign in to track shipments, manage orders, and stay on top of your business with RIPOMA GLOBAL.
                </p>

                <div className="hidden md:block mt-8 space-y-3">
                  {highlights.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="flex items-start gap-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm px-4 py-3 animate-auth-float"
                        style={{ animationDelay: `${i * 0.7}s` }}
                      >
                        <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-400/25 flex items-center justify-center shrink-0">
                          <Icon size={16} className="text-teal-300" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white leading-tight">{item.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-500">
                <span>© {new Date().getFullYear()} RIPOMA GLOBAL Inc.</span>
                <span className="inline-flex items-center gap-1 text-teal-400/80">
                  <ShieldCheck size={12} />
                  256-bit encrypted
                </span>
              </div>
            </div>

            {/* ── Right Login Form ── */}
            <div className="md:w-[55%] p-6 sm:p-8 lg:p-12 flex flex-col justify-center bg-white">
              <div className="w-full max-w-md mx-auto">
                <div className="mb-7">
                  <h3 className="text-2xl font-extrabold text-slate-900">Welcome back</h3>
                  <p className="text-slate-500 text-sm mt-1.5">
                    Sign in to continue to your customer account.
                  </p>
                </div>

                <div className="mb-5">
                  <GoogleSignInButton
                    onCredential={handleGoogleCredential}
                    disabled={submitting || googleSubmitting}
                    text="signin_with"
                  />
                </div>

                <div className="relative mb-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="bg-white px-3 text-slate-400 font-bold uppercase tracking-widest">
                      or continue with email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {unverifiedEmail && (
                    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-3.5 text-sm text-amber-800 animate-auth-fade-up">
                      <p className="font-bold">Email not verified</p>
                      <p className="mt-1 text-xs text-amber-700">
                        Check your inbox for the verification link, or request a new one.
                      </p>
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="mt-2 text-xs font-bold text-teal-700 hover:text-teal-800 underline underline-offset-2 disabled:opacity-50"
                      >
                        {resending ? 'Sending…' : 'Resend verification email'}
                      </button>
                    </div>
                  )}

                  {/* Email */}
                  <div className="group">
                    <label className="auth-label">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail size={12} className="text-teal-500" />
                        Email Address
                      </span>
                    </label>
                    <input
                      id="customer-login-email"
                      type="email"
                      className={`auth-input ${
                        errors.email ? 'border-rose-400 focus:ring-rose-500/10 focus:border-rose-500' : ''
                      }`}
                      placeholder="you@example.com"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-rose-500 text-xs mt-1.5 font-semibold">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="group">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="auth-label mb-0">
                        <span className="inline-flex items-center gap-1.5">
                          <Lock size={12} className="text-teal-500" />
                          Password
                        </span>
                      </label>
                      <Link
                        to="/customer/forgot-password"
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="customer-login-password"
                        type={showPassword ? 'text' : 'password'}
                        className={`auth-input pr-10 ${
                          errors.password ? 'border-rose-400 focus:ring-rose-500/10 focus:border-rose-500' : ''
                        }`}
                        placeholder="••••••••••••"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-teal-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-rose-500 text-xs mt-1.5 font-semibold">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    id="customer-login-submit"
                    type="submit"
                    disabled={submitting || googleSubmitting}
                    className="auth-btn-primary mt-2"
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

                <p className="text-sm text-slate-500 text-center mt-6">
                  Don't have an account?{' '}
                  <Link
                    to="/customer/register"
                    className="font-bold text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    Create one for free
                  </Link>
                </p>

                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-teal-600 transition-colors"
                  >
                    <Globe size={12} />
                    Staff / Admin Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLogin;
