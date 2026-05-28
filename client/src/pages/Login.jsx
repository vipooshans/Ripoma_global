import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Lock, Mail, Globe, ArrowRight } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

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
      navigate('/admin/users');
    } catch (err) {
      toast.error(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 px-4 py-8">
      {/* Centered card container */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Left Side: Brand Panel */}
        <div className="md:w-1/2 bg-slate-900 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-10 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl"></div>

          {/* Top Logo */}
          <div className="flex items-center gap-2.5 relative z-10">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500 text-slate-950 font-extrabold text-xl shadow-lg shadow-teal-500/20">
              R
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-wider leading-none">RIPOMA</h1>
              <span className="text-[10px] text-teal-400 font-bold tracking-widest uppercase">GLOBAL</span>
            </div>
          </div>

          {/* Center Content */}
          <div className="my-8 md:my-0 relative z-10">
            <Globe className="w-16 h-16 text-teal-400 mb-6 animate-pulse" />
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight">
              Import & Export Management Portal
            </h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Streamline operations, coordinate global logistics, and administer user access rights inside a secure corporate hub.
            </p>
          </div>

          {/* Bottom Copyright */}
          <div className="text-xs text-slate-500 relative z-10">
            © {new Date().getFullYear()} RIPOMA GLOBAL Inc. All rights reserved.
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-xl lg:text-2xl font-extrabold text-slate-800">Welcome Back</h3>
            <p className="text-slate-550 text-sm mt-1">Please enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  className={`form-input pl-10 ${
                    errors.email ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : ''
                  }`}
                  placeholder="name@company.com"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="form-label mb-0">Password</label>
                <Link
                  to="/forgot-password"
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
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
        </div>
      </div>
    </div>
  );
};

export default Login;
