import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const AdminOnlyRoute = ({ children }) => {
  const { hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasRole('admin')) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminOnlyRoute;
