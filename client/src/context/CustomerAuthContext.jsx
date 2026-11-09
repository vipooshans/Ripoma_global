import React, { createContext, useState, useEffect } from 'react';
import customerAuthService from '../services/customerAuth.service';
import { setCustomerAuthHeader } from '../services/api';

export const CustomerAuthContext = createContext(null);

const PROTECTED_CUSTOMER_PATHS = [
  '/customer/profile',
  '/customer/orders'
];

const isProtectedCustomerPath = (pathname = '') =>
  PROTECTED_CUSTOMER_PATHS.some((p) => pathname.startsWith(p));

export const CustomerAuthProvider = ({ children }) => {
  const [customerUser, setCustomerUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const IDLE_MS = 30 * 60 * 1000;

  const checkSession = async () => {
    // Don't restore customer session while browsing staff admin routes
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/customer')) {
      setLoading(false);
      return;
    }

    try {
      const refreshData = await customerAuthService.refresh();
      if (!refreshData || !refreshData.accessToken) {
        setCustomerUser(null);
        return;
      }
      const data = await customerAuthService.getCurrentCustomer();
      if (data?.customer) {
        setCustomerUser(data.customer);
      }
    } catch {
      setCustomerUser(null);
      setCustomerAuthHeader(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const handleExpired = () => {
      setCustomerUser(null);
      setCustomerAuthHeader(null);
      setError('Your session has expired. Please log in again.');

      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (isProtectedCustomerPath(path)) {
        window.location.href = '/customer/login';
      }
    };

    window.addEventListener('customer-auth-expired', handleExpired);
    return () => window.removeEventListener('customer-auth-expired', handleExpired);
  }, []);

  // Idle timeout: sign out after 30 minutes without activity while authenticated
  useEffect(() => {
    if (!customerUser) return undefined;

    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await customerAuthService.logout();
        } catch {
          /* ignore */
        }
        setCustomerUser(null);
        setCustomerAuthHeader(null);
        setError('Signed out due to inactivity.');
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        if (isProtectedCustomerPath(path)) {
          window.location.href = '/customer/login';
        }
      }, IDLE_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [customerUser]);

  const login = async (email, password) => {
    try {
      setError(null);
      const data = await customerAuthService.login(email, password);
      if (data.customer) {
        setCustomerUser(data.customer);
      }
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw err;
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      setError(null);
      const data = await customerAuthService.loginWithGoogle(credential);
      if (data.customer) {
        setCustomerUser(data.customer);
      }
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Google login failed. Please try again.';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await customerAuthService.logout();
    } finally {
      setCustomerUser(null);
      setCustomerAuthHeader(null);
    }
  };

  const value = {
    customerUser,
    isAuthenticated: Boolean(customerUser),
    loading,
    error,
    login,
    loginWithGoogle,
    logout,
    refreshCustomer: checkSession
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};
