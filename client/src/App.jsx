import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

// Old Pages
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/admin/Dashboard';
import UserList from './pages/admin/UserList';
import UserForm from './pages/admin/UserForm';
import RolesPermissions from './pages/admin/RolesPermissions';
import Profile from './pages/Profile';

// Inventory Module Pages
import InventoryDashboard from './pages/inventory/Dashboard';
import ProductList from './pages/inventory/ProductList';
import ProductForm from './pages/inventory/ProductForm';
import ProductDetail from './pages/inventory/ProductDetail';
import WarehouseList from './pages/inventory/WarehouseList';
import WarehouseDetail from './pages/inventory/WarehouseDetail';
import StockMovementGrid from './pages/inventory/StockMovementGrid';
import AlertsCenter from './pages/inventory/AlertsCenter';

// Supplier & Customer Management Module
import SupplierList from './pages/suppliers/SupplierList';
import SupplierForm from './pages/suppliers/SupplierForm';
import SupplierDetail from './pages/suppliers/SupplierDetail';
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';
import CustomerDetail from './pages/customers/CustomerDetail';
import ContactDirectory from './pages/contacts/ContactDirectory';
import CommunicationLog from './pages/contacts/CommunicationLog';

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
          <Route index element={<Navigate to="/inventory" replace />} />
          
          {/* Admin User Management */}
          <Route path="admin/dashboard" element={<Dashboard />} />
          <Route path="admin/users" element={<UserList />} />
          <Route path="admin/users/add" element={<UserForm />} />
          <Route path="admin/users/:id/edit" element={<UserForm />} />
          <Route path="admin/roles" element={<RolesPermissions />} />
          <Route path="profile" element={<Profile />} />

          {/* Product & Inventory Management Module */}
          <Route path="inventory" element={<InventoryDashboard />} />
          <Route path="inventory/products" element={<ProductList />} />
          <Route path="inventory/products/add" element={<ProductForm />} />
          <Route path="inventory/products/:id" element={<ProductDetail />} />
          <Route path="inventory/products/:id/edit" element={<ProductForm />} />
          <Route path="inventory/warehouses" element={<WarehouseList />} />
          <Route path="inventory/warehouses/:id" element={<WarehouseDetail />} />
          <Route path="inventory/stock" element={<StockMovementGrid />} />
          <Route path="inventory/alerts" element={<AlertsCenter />} />

          {/* Supplier & Customer Management Module */}
          <Route path="suppliers" element={<SupplierList />} />
          <Route path="suppliers/add" element={<SupplierForm />} />
          <Route path="suppliers/:id" element={<SupplierDetail />} />
          <Route path="suppliers/:id/edit" element={<SupplierForm />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/add" element={<CustomerForm />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="customers/:id/edit" element={<CustomerForm />} />
          <Route path="contacts" element={<ContactDirectory />} />
          <Route path="contacts/:type/:id/communications" element={<CommunicationLog />} />
        </Route>

        {/* Catch-all fallback redirects to inventory */}
        <Route path="*" element={<Navigate to="/inventory" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
