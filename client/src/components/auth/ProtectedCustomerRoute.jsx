import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';

/**
 * Redirects unauthenticated users to the customer login page
 */
const ProtectedCustomerRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(CustomerAuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/customer/login" replace />;
};

export default ProtectedCustomerRoute;
