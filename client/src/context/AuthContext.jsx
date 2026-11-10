import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/auth.service';
import {
  setAuthHeader,
  hasStaffSessionHint,
  setStaffSessionHint
} from '../services/api';

export const AuthContext = createContext(null);

const isCustomerPortalPath = () =>
  typeof window !== 'undefined' && window.location.pathname.startsWith('/customer');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkSession = async () => {
    // Staff session restore is not needed on the customer portal
    if (isCustomerPortalPath()) {
      setLoading(false);
      return;
    }

    // Do not call refresh if no staff session hint exists
    if (!hasStaffSessionHint()) {
      setLoading(false);
      return;
    }

    try {
      const refreshData = await authService.refresh();
      if (!refreshData?.accessToken) {
        setStaffSessionHint(false);
        return;
      }
      const data = await authService.getCurrentUser();
      if (data?.user) {
        setUser(data.user);
        setStaffSessionHint(true);
      }
    } catch {
      setAuthHeader(null);
      setStaffSessionHint(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const handleAuthExpired = () => {
      setUser(null);
      setStaffSessionHint(false);
      setError('Your session has expired. Please log in again.');
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const data = await authService.login(email, password);
      setUser(data.user);
      setStaffSessionHint(true);
      return data.user;
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Login failed. Please check credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setUser(null);
      setError(null);
      setAuthHeader(null);
      setStaffSessionHint(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    setUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
