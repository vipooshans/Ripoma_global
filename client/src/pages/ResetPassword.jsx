import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import authService from '../services/auth.service';
import { Eye, EyeOff, Lock, ArrowLeft, ShieldAlert } from 'lucide-react';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Confirm password is required')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(resetPasswordSchema)
  });

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      await authService.resetPassword(token, data.password);
      toast.success('Your password has been reset successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 text-teal-600 font-extrabold text-2xl shadow-inner">
            R
          </div>
        </div>

        <div className="mb-6 text-center">
          <h3 className="text-xl font-extrabold text-slate-850">Reset Password</h3>
          <p className="text-slate-500 text-xs mt-1">
            Please enter your new password below. It must be at least 8 characters long.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="form-label">New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`form-input pl-10 pr-10 ${
                  errors.password ? 'border-rose-500 focus:ring-rose-500/20' : ''
                }`}
                placeholder="••••••••"
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

          {/* Confirm Password */}
          <div>
            <label className="form-label">Confirm New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`form-input pl-10 ${
                  errors.confirmPassword ? 'border-rose-500 focus:ring-rose-500/20' : ''
                }`}
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-rose-500 text-xs mt-1 font-semibold">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
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

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Cancel and return to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
