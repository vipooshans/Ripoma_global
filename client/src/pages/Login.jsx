import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Users,
  Boxes,
  UserCircle
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const highlights = [
  {
    icon: BarChart3,
    title: 'Operations dashboard',
    text: 'Imports, exports, and finance at a glance.'
  },
  {
    icon: Boxes,
    title: 'Inventory control',
    text: 'Stock, warehouses, and alerts in real time.'
  },
  {
    icon: Users,
    title: 'Team & access',
    text: 'Role-based permissions for your staff.'
  }
];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      await login(data.email, data.password);
      toast.success('Successfully logged in! Welcome back.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-slate-950 px-4 py-10 overflow-hidden">
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
            <div className="md:w-[45%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white p-8 lg:p-10 flex flex-col justify-between">
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
              <div className="my-10 md:my-0 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-300 text-[11px] font-bold uppercase tracking-widest mb-5">
                  <Sparkles size={12} />
                  Staff Portal
                </div>
                <h2 className="text-3xl lg:text-[2.1rem] font-extrabold leading-tight">
                  Import & Export, <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">
                    under control.
                  </span>
                </h2>
                <p className="text-slate-400 text-sm mt-4 leading-relaxed max-w-xs">
                  Sign in to manage operations, coordinate global logistics, and administer access — all in one secure hub.
                </p>

                <div className="mt-8 space-y-3">
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
            <div className="md:w-[55%] p-8 lg:p-12 flex flex-col justify-center bg-white">
              <div className="w-full max-w-md mx-auto">
                <div className="mb-8">
                  <h3 className="text-2xl font-extrabold text-slate-900">Welcome back</h3>
                  <p className="text-slate-500 text-sm mt-1.5">
                    Enter your credentials to access your dashboard.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Email */}
                  <div className="group">
                    <label className="auth-label">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail size={12} className="text-teal-500" />
                        Email Address
                      </span>
                    </label>
                    <input
                      type="email"
                      className={`auth-input ${
                        errors.email ? 'border-rose-400 focus:ring-rose-500/10 focus:border-rose-500' : ''
                      }`}
                      placeholder="name@company.com"
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
                        to="/forgot-password"
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
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
                    type="submit"
                    disabled={submitting}
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

                <div className="mt-8 pt-5 border-t border-slate-100 text-center">
                  <Link
                    to="/customer/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-teal-600 transition-colors"
                  >
                    <UserCircle size={12} />
                    Customer Login
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

export default Login;
