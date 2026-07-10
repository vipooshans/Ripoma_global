import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';

/**
 * Redirects unauthenticated users to the customer login page
 */
const ProtectedCustomerRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(CustomerAuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/customer/login" state={{ from: location }} replace />
  );
};

export default ProtectedCustomerRoute;
