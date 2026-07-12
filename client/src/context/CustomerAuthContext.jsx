import React, { createContext, useState, useEffect } from 'react';
import customerAuthService from '../services/customerAuth.service';
import { setCustomerAuthHeader } from '../services/api';

export const CustomerAuthContext = createContext(null);

const PUBLIC_CUSTOMER_PATHS = [
  '/customer/login',
  '/customer/register',
  '/customer/forgot-password'
];

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
      if (!refreshData.accessToken) {
        return;
      }
      const data = await customerAuthService.getCurrentCustomer();
      if (data?.customer) {
        setCustomerUser(data.customer);
      }
    } catch {
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

      const path = window.location.pathname;
      const isPublic =
        PUBLIC_CUSTOMER_PATHS.some((p) => path.startsWith(p)) ||
        path.startsWith('/customer/reset-password') ||
        path.startsWith('/customer/verify-email');

      if (path.startsWith('/customer') && !isPublic) {
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
        if (window.location.pathname.startsWith('/customer')) {
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
      setCustomerUser(data.customer);
      return data.customer;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      const loginError = new Error(msg);
      loginError.code = err.response?.data?.code;
      throw loginError;
    }
  };

  const logout = async () => {
    try {
      await customerAuthService.logout();
    } catch (err) {
      console.error('Customer logout error:', err);
    } finally {
      setCustomerUser(null);
      setError(null);
      setCustomerAuthHeader(null);
    }
  };

  const value = {
    customerUser,
    loading,
    error,
    isAuthenticated: !!customerUser,
    login,
    logout,
    setCustomerUser
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};
