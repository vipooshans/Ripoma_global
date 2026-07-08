import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import customerAuthService from '../../services/customerAuth.service';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const CustomerEmailVerify = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const data = await customerAuthService.verifyEmail(token);
        setMessage(data.message || 'Email verified successfully!');
        setStatus('success');
      } catch (err) {
        setMessage(
          err.response?.data?.message ||
            'This verification link is invalid or has expired. Please request a new one.'
        );
        setStatus('error');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center border border-slate-100">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 font-extrabold text-2xl shadow-inner">
            R
          </div>
        </div>

        {/* Loading state */}
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-14 h-14 text-teal-500 animate-spin" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800">Verifying Your Email…</h3>
            <p className="text-slate-500 text-sm">Please wait while we verify your account.</p>
          </div>
        )}

        {/* Success state */}
        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-18 h-18 w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-100">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-xl font-extrabold text-slate-800">Email Verified!</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
            <div className="pt-2">
              <Link
                id="verify-go-login"
                to="/customer/login"
                className="btn-primary w-full py-2.5 inline-flex items-center justify-center"
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center border-2 border-rose-100">
                <XCircle className="w-10 h-10 text-rose-500" />
              </div>
            </div>
            <h3 className="text-xl font-extrabold text-slate-800">Verification Failed</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                to="/customer/register"
                className="btn-primary w-full py-2.5 inline-flex items-center justify-center"
              >
                Register Again
              </Link>
              <Link
                to="/customer/login"
                className="btn-secondary w-full py-2.5 inline-flex items-center justify-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerEmailVerify;
