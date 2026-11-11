import React, { createContext, useState, useEffect } from 'react';
import customerAuthService from '../services/customerAuth.service';
import {
  setCustomerAuthHeader,
  hasCustomerSessionHint,
  setCustomerSessionHint
} from '../services/api';

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

    // Fast-path: anonymous visitors without a session hint never fire refresh requests
    if (!hasCustomerSessionHint()) {
      setCustomerUser(null);
      setLoading(false);
      return;
    }

    try {
      const refreshData = await customerAuthService.refresh();
      if (!refreshData || !refreshData.accessToken) {
        setCustomerUser(null);
        setCustomerSessionHint(false);
        return;
      }
      const data = await customerAuthService.getCurrentCustomer();
      if (data?.customer) {
        setCustomerUser(data.customer);
        setCustomerSessionHint(true);
      }
    } catch {
      setCustomerUser(null);
      setCustomerAuthHeader(null);
      setCustomerSessionHint(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const handleExpired = () => {
      setCustomerUser(null);
      setCustomerAuthHeader(null);
      setCustomerSessionHint(false);
      setError('Your session has expired. Please log in again.');

      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (isProtectedCustomerPath(path)) {
        window.location.href = '/customer/login';
      }
    };

    window.addEventListener('customer-auth-expired', handleExpired);
    return () => {
      window.removeEventListener('customer-auth-expired', handleExpired);
    };
  }, []);

  // Idle timer auto logout
  useEffect(() => {
    if (!customerUser) return undefined;

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setCustomerUser(null);
        setCustomerAuthHeader(null);
        setCustomerSessionHint(false);
        setError('Signed out due to inactivity.');
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        if (isProtectedCustomerPath(path)) {
          window.location.href = '/customer/login';
        }
      }, IDLE_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [customerUser]);

  const login = async (email, password) => {
    try {
      setError(null);
      const data = await customerAuthService.login(email, password);
      if (data.customer) {
        setCustomerUser(data.customer);
        setCustomerSessionHint(true);
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
        setCustomerSessionHint(true);
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
      setCustomerSessionHint(false);
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
