import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../services/auth.service';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address')
});

const ForgotPassword = () => {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      await authService.forgotPassword(data.email);
      setSuccess(true);
      toast.success('Reset link triggered!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error occurred. Please try again.');
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

        {success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center text-emerald-500">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800">Check Your Email</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              If the email address you entered matches an active account in our system, we have sent a secure password reset link.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                <span>Return to Login</span>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <h3 className="text-xl font-extrabold text-slate-850">Forgot Password?</h3>
              <p className="text-slate-500 text-xs mt-1">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-2.5 mt-2"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Login</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
