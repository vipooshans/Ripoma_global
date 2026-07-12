import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import PublicRoute from './components/auth/PublicRoute';
import PublicCustomerRoute from './components/auth/PublicCustomerRoute';
import ProtectedCustomerRoute from './components/auth/ProtectedCustomerRoute';

// Customer Portal Pages
import CustomerHome from './pages/customer/Home';
import CustomerLogin from './pages/customer/Login';
import CustomerRegister from './pages/customer/Register';
import CustomerForgotPassword from './pages/customer/ForgotPassword';
import CustomerResetPassword from './pages/customer/ResetPassword';
import CustomerEmailVerify from './pages/customer/EmailVerify';
import CustomerProfile from './pages/customer/Profile';
import CustomerProducts from './pages/customer/Products';
import CustomerProductDetail from './pages/customer/ProductDetail';
import CustomerCategories from './pages/customer/Categories';
import CustomerCategoryDetail from './pages/customer/CategoryDetail';
import CustomerCart from './pages/customer/Cart';
import CustomerWishlist from './pages/customer/Wishlist';
import CustomerCheckout from './pages/customer/Checkout';
import CustomerOrders from './pages/customer/Orders';
import CustomerOrderConfirmation from './pages/customer/OrderConfirmation';
import CustomerStorefrontLayout from './components/storefront/CustomerStorefrontLayout';

// Old Pages
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
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
import CategoryList from './pages/inventory/CategoryList';
import CategoryForm from './pages/inventory/CategoryForm';
import StorefrontOrderList from './pages/inventory/StorefrontOrderList';

// Supplier & Customer Management Module
import SupplierList from './pages/suppliers/SupplierList';
import SupplierForm from './pages/suppliers/SupplierForm';
import SupplierDetail from './pages/suppliers/SupplierDetail';
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';
import CustomerDetail from './pages/customers/CustomerDetail';
import ContactDirectory from './pages/contacts/ContactDirectory';
import CommunicationLog from './pages/contacts/CommunicationLog';

// Import Management Module Pages
import ImportsDashboard from './pages/imports/Dashboard';
import OrderList from './pages/imports/OrderList';
import OrderCreate from './pages/imports/OrderCreate';
import OrderDetail from './pages/imports/OrderDetail';
import OrderApprove from './pages/imports/OrderApprove';
import GoodsReceiptForm from './pages/imports/GoodsReceiptForm';
import TrackingBoard from './pages/imports/TrackingBoard';
import DeliverySchedule from './pages/imports/DeliverySchedule';
import ApprovalsQueue from './pages/imports/ApprovalsQueue';

// Export Management Module Pages
import ExportsDashboard from './pages/exports/Dashboard';
import ExportOrderList from './pages/exports/OrderList';
import ExportOrderCreate from './pages/exports/OrderCreate';
import ExportOrderDetail from './pages/exports/OrderDetail';
import InvoiceView from './pages/exports/InvoiceView';
import InvoiceList from './pages/exports/InvoiceList';
import DispatchForm from './pages/exports/DispatchForm';
import DispatchBoard from './pages/exports/DispatchBoard';

// Document Management Module
import DocumentsDashboard from './pages/documents/Dashboard';
import DocumentLibrary from './pages/documents/Library';
import DocumentUpload from './pages/documents/UploadForm';
import DocumentDetail from './pages/documents/DocumentDetail';
import DocumentInvoices from './pages/documents/InvoicesView';
import DocumentActivity from './pages/documents/ActivityLog';

// Financial Management Module Pages
import FinanceDashboard from './pages/finance/Dashboard';
import PaymentList from './pages/finance/PaymentList';
import PaymentForm from './pages/finance/PaymentForm';
import PaymentDetail from './pages/finance/PaymentDetail';
import ExpenseList from './pages/finance/ExpenseList';
import ExpenseForm from './pages/finance/ExpenseForm';
import ExpenseDetail from './pages/finance/ExpenseDetail';
import ProfitAnalysis from './pages/finance/ProfitAnalysis';
import TaxDuty from './pages/finance/TaxDuty';
import CurrencyConverter from './pages/finance/CurrencyConverter';

// Reporting & Analytics Module Pages
import ReportsDashboard from './pages/reports/Dashboard';
import SalesReport from './pages/reports/SalesReport';
import FinancialReport from './pages/reports/FinancialReport';
import BusinessAnalytics from './pages/reports/BusinessAnalytics';
import ReportBuilder from './pages/reports/ReportBuilder';
import ScheduledReports from './pages/reports/ScheduledReports';
import ExportHistory from './pages/reports/ExportHistory';

// Notification & Alerts Module Pages
import NotificationsDashboard from './pages/notifications/Dashboard';
import NotificationCentre from './pages/notifications/Centre';
import NotificationSettings from './pages/notifications/Settings';
import RemindersBoard from './pages/notifications/Reminders';
import ActivityLogPage from './pages/notifications/ActivityLog';

import { NotificationProvider } from './context/NotificationContext';

function App() {
  return (
    <AuthProvider>
      <CustomerAuthProvider>
      <NotificationProvider>
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
        {/* ── Staff Public Routes ── */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* ── Customer Portal Routes ── */}
        <Route element={<CustomerStorefrontLayout />}>
          <Route path="/customer" element={<CustomerHome />} />
          <Route path="/customer/products" element={<CustomerProducts />} />
          <Route path="/customer/products/:id" element={<CustomerProductDetail />} />
          <Route path="/customer/categories" element={<CustomerCategories />} />
          <Route path="/customer/categories/:id" element={<CustomerCategoryDetail />} />
          <Route path="/customer/cart" element={<CustomerCart />} />
          <Route path="/customer/wishlist" element={<CustomerWishlist />} />
          <Route path="/customer/checkout" element={<CustomerCheckout />} />
          <Route path="/customer/orders" element={<CustomerOrders />} />
          <Route path="/customer/orders/:id" element={<CustomerOrderConfirmation />} />
          <Route
            path="/customer/profile"
            element={
              <ProtectedCustomerRoute>
                <CustomerProfile />
              </ProtectedCustomerRoute>
            }
          />
        </Route>
        <Route path="/customer/login" element={<PublicCustomerRoute><CustomerLogin /></PublicCustomerRoute>} />
        <Route path="/customer/register" element={<PublicCustomerRoute><CustomerRegister /></PublicCustomerRoute>} />
        <Route path="/customer/forgot-password" element={<CustomerForgotPassword />} />
        <Route path="/customer/reset-password/:token" element={<CustomerResetPassword />} />
        <Route path="/customer/verify-email/:token" element={<CustomerEmailVerify />} />

        {/* Protected Dashboard Layout Routes */}
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Admin User Management */}
          <Route path="admin/dashboard" element={<AdminDashboard />} />
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
          <Route path="inventory/categories" element={<CategoryList />} />
          <Route path="inventory/categories/add" element={<CategoryForm />} />
          <Route path="inventory/categories/:id/edit" element={<CategoryForm />} />
          <Route path="inventory/warehouses" element={<WarehouseList />} />
          <Route path="inventory/warehouses/:id" element={<WarehouseDetail />} />
          <Route path="inventory/stock" element={<StockMovementGrid />} />
          <Route path="inventory/alerts" element={<AlertsCenter />} />
          <Route path="inventory/storefront-orders" element={<StorefrontOrderList />} />

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

          {/* Import Management Module */}
          <Route path="imports" element={<ImportsDashboard />} />
          <Route path="imports/orders" element={<OrderList />} />
          <Route path="imports/orders/create" element={<OrderCreate />} />
          <Route path="imports/orders/:id" element={<OrderDetail />} />
          <Route path="imports/orders/:id/edit" element={<OrderCreate />} />
          <Route path="imports/orders/:id/approve" element={<OrderApprove />} />
          <Route path="imports/orders/:id/receive" element={<GoodsReceiptForm />} />
          <Route path="imports/tracking" element={<TrackingBoard />} />
          <Route path="imports/delivery-schedule" element={<DeliverySchedule />} />
          <Route path="imports/approvals" element={<ApprovalsQueue />} />

          {/* Export Management Module */}
          <Route path="exports" element={<ExportsDashboard />} />
          <Route path="exports/orders" element={<ExportOrderList />} />
          <Route path="exports/orders/create" element={<ExportOrderCreate />} />
          <Route path="exports/orders/:id" element={<ExportOrderDetail />} />
          <Route path="exports/orders/:id/edit" element={<ExportOrderCreate />} />
          <Route path="exports/invoices" element={<InvoiceList />} />
          <Route path="exports/invoices/:id" element={<InvoiceView />} />
          <Route path="exports/dispatch/create" element={<DispatchForm />} />
          <Route path="exports/dispatch/board" element={<DispatchBoard />} />

          {/* Document Management Module */}
          <Route path="documents" element={<DocumentsDashboard />} />
          <Route path="documents/library" element={<DocumentLibrary />} />
          <Route path="documents/upload" element={<DocumentUpload />} />
          <Route path="documents/invoices" element={<DocumentInvoices />} />
          <Route path="documents/activity" element={<DocumentActivity />} />
          <Route path="documents/:id" element={<DocumentDetail />} />

          {/* Financial Management Module */}
          <Route path="finance" element={<FinanceDashboard />} />
          <Route path="finance/payments" element={<PaymentList />} />
          <Route path="finance/payments/add" element={<PaymentForm />} />
          <Route path="finance/payments/:id" element={<PaymentDetail />} />
          <Route path="finance/payments/:id/edit" element={<PaymentForm />} />
          <Route path="finance/expenses" element={<ExpenseList />} />
          <Route path="finance/expenses/add" element={<ExpenseForm />} />
          <Route path="finance/expenses/:id" element={<ExpenseDetail />} />
          <Route path="finance/expenses/:id/edit" element={<ExpenseForm />} />
          <Route path="finance/profit" element={<ProfitAnalysis />} />
          <Route path="finance/taxes" element={<TaxDuty />} />
          <Route path="finance/currency" element={<CurrencyConverter />} />

          {/* Reporting & Analytics Module */}
          <Route path="reports" element={<ReportsDashboard />} />
          <Route path="reports/sales" element={<SalesReport />} />
          <Route path="reports/financial" element={<FinancialReport />} />
          <Route path="reports/business-analytics" element={<BusinessAnalytics />} />
          <Route path="reports/builder" element={<ReportBuilder />} />
          <Route path="reports/scheduled" element={<ScheduledReports />} />
          <Route path="reports/history" element={<ExportHistory />} />

          {/* Notification & Alerts Module */}
          <Route path="notifications" element={<NotificationsDashboard />} />
          <Route path="notifications/centre" element={<NotificationCentre />} />
          <Route path="notifications/settings" element={<NotificationSettings />} />
          <Route path="notifications/reminders" element={<RemindersBoard />} />
          <Route path="notifications/activity-log" element={<ActivityLogPage />} />
        </Route>

        {/* Catch-all fallback redirects to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </NotificationProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  );
}

export default App;
