import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import customerAuthService from '../../services/customerAuth.service';
import { Eye, EyeOff, Lock, ArrowLeft } from 'lucide-react';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must include a letter')
      .regex(/[0-9]/, 'Password must include a number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password')
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

const CustomerResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      await customerAuthService.resetPassword(token, data.password);
      toast.success('Password reset! You can now log in with your new password.');
      navigate('/customer/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8 border border-slate-100">

        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 font-extrabold text-2xl shadow-inner">
            R
          </div>
        </div>

        <div className="mb-6 text-center">
          <h3 className="text-xl font-extrabold text-slate-800">Reset Your Password</h3>
          <p className="text-slate-500 text-xs mt-1">
            Enter your new password below. Use at least 8 characters with a letter and a number.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="form-label">New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="customer-reset-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input pl-10 pr-10 ${errors.password ? 'border-rose-500' : ''}`}
                placeholder="••••••••"
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

          {/* Confirm Password */}
          <div>
            <label className="form-label">Confirm New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="customer-reset-confirm"
                type={showPassword ? 'text' : 'password'}
                className={`form-input pl-10 ${errors.confirmPassword ? 'border-rose-500' : ''}`}
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            id="customer-reset-submit"
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 mt-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            to="/customer/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Cancel — Return to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CustomerResetPassword;
