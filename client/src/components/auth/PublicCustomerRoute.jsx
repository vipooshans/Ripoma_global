import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';

/**
 * Redirects authenticated customers away from public-only pages
 * (e.g. /customer/login → /customer/profile if already logged in)
 */
const PublicCustomerRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(CustomerAuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/customer/profile" replace /> : children;
};

export default PublicCustomerRoute;
