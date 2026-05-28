import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/admin/Dashboard';
import UserList from './pages/admin/UserList';
import UserForm from './pages/admin/UserForm';
import RolesPermissions from './pages/admin/RolesPermissions';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'font-sans text-xs font-semibold text-slate-800',
          success: {
            iconTheme: {
              primary: '#0D9488',
              secondary: '#FFFFFF'
            }
          }
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Protected Dashboard Layout Routes */}
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="admin/dashboard" element={<Dashboard />} />
          <Route path="admin/users" element={<UserList />} />
          <Route path="admin/users/add" element={<UserForm />} />
          <Route path="admin/users/:id/edit" element={<UserForm />} />
          <Route path="admin/roles" element={<RolesPermissions />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Catch-all fallback redirects to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
