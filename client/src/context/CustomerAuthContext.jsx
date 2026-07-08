import React, { createContext, useState, useEffect } from 'react';
import customerAuthService from '../services/customerAuth.service';
import { setCustomerAuthHeader } from '../services/api';

export const CustomerAuthContext = createContext(null);

export const CustomerAuthProvider = ({ children }) => {
  const [customerUser, setCustomerUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkSession = async () => {
    try {
      const data = await customerAuthService.getCurrentCustomer();
      if (data && data.customer) {
        setCustomerUser(data.customer);
      }
    } catch (err) {
      // No active customer session — silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const handleExpired = () => {
      setCustomerUser(null);
      setError('Your session has expired. Please log in again.');
    };

    window.addEventListener('customer-auth-expired', handleExpired);
    return () => window.removeEventListener('customer-auth-expired', handleExpired);
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const data = await customerAuthService.login(email, password);
      setCustomerUser(data.customer);
      return data.customer;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
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
