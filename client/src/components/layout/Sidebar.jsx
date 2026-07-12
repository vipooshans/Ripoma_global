import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Users,
  ShieldCheck,
  User,
  LogOut,
  LayoutDashboard,
  Globe,
  X,
  Package,
  Building,
  ArrowDownUp,
  AlertTriangle,
  Truck,
  BookUser,
  Phone,
  FileText,
  Calendar,
  Layers,
  FolderOpen,
  Activity,
  Wallet,
  Home,
  ShoppingBag,
  Star,
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout, hasPermission } = useAuth();

  const navigation = [
    { group: 'Home', items: [
      { name: 'Command Centre', to: '/dashboard', icon: Home, show: true },
    ]},
    { group: 'Inventory', items: [
      { name: 'Dashboard', to: '/inventory', icon: LayoutDashboard, show: true },
      { name: 'Products', to: '/inventory/products', icon: Package, show: true },
      { name: 'Categories', to: '/inventory/categories', icon: Layers, show: true },
      { name: 'Warehouses', to: '/inventory/warehouses', icon: Building, show: true },
      { name: 'Movements', to: '/inventory/stock', icon: ArrowDownUp, show: true },
      { name: 'Alerts', to: '/inventory/alerts', icon: AlertTriangle, show: true },
      { name: 'Web Orders', to: '/inventory/storefront-orders', icon: ShoppingBag, show: true },
      { name: 'Product Reviews', to: '/inventory/storefront-reviews', icon: Star, show: true },
    ]},
    { group: 'CRM', items: [
      { name: 'Suppliers', to: '/suppliers', icon: Truck, show: true },
      { name: 'Customers', to: '/customers', icon: BookUser, show: true },
      { name: 'Contacts', to: '/contacts', icon: Phone, show: true },
    ]},
    { group: 'Procurement & Imports', items: [
      { name: 'Imports Dashboard', to: '/imports', icon: Globe, show: true },
      { name: 'Purchase Orders', to: '/imports/orders', icon: FileText, show: true },
      { name: 'Logistics Tracking', to: '/imports/tracking', icon: Truck, show: true },
      { name: 'Delivery Calendar', to: '/imports/delivery-schedule', icon: Calendar, show: true },
    ]},
    { group: 'Sales & Exports', items: [
      { name: 'Exports Dashboard', to: '/exports', icon: Globe, show: true },
      { name: 'Sales Orders', to: '/exports/orders', icon: FileText, show: true },
      { name: 'Invoices', to: '/exports/invoices', icon: FileText, show: true },
      { name: 'Dispatch Board', to: '/exports/dispatch/board', icon: Truck, show: true },
    ]},
    { group: 'Financial Control', items: [
      { name: 'Finance Dashboard', to: '/finance', icon: LayoutDashboard, show: hasPermission('finance:read') },
      { name: 'Payments Ledger', to: '/finance/payments', icon: ArrowDownUp, show: hasPermission('finance:read') },
      { name: 'Expenses', to: '/finance/expenses', icon: Wallet, show: hasPermission('finance:read') },
      { name: 'P&L Analytics', to: '/finance/profit', icon: Activity, show: hasPermission('finance:read') },
      { name: 'Tax & Duties', to: '/finance/taxes', icon: FileText, show: hasPermission('finance:read') },
      { name: 'Currency Center', to: '/finance/currency', icon: Globe, show: hasPermission('finance:read') },
    ]},
    { group: 'Intelligence Center', items: [
      { name: 'Analytics Dashboard', to: '/reports', icon: LayoutDashboard, show: true },
      { name: 'Sales Report', to: '/reports/sales', icon: FileText, show: true },
      { name: 'Financial Ageing', to: '/reports/financial', icon: Wallet, show: true },
      { name: 'Business Intelligence', to: '/reports/business-analytics', icon: Activity, show: true },
      { name: 'Report Builder', to: '/reports/builder', icon: Layers, show: true },
      { name: 'Automations Schedule', to: '/reports/scheduled', icon: Calendar, show: true },
      { name: 'Export History', to: '/reports/history', icon: FolderOpen, show: true },
    ]},
    { group: 'Document Management', items: [
      { name: 'Doc Dashboard', to: '/documents', icon: FolderOpen, show: true },
      { name: 'Library', to: '/documents/library', icon: FileText, show: true },
      { name: 'Invoices', to: '/documents/invoices', icon: FileText, show: true },
      { name: 'Activity Log', to: '/documents/activity', icon: Activity, show: true },
    ]},
    { group: 'Alerts & Activity', items: [
      { name: 'Control Centre', to: '/notifications', icon: AlertTriangle, show: true },
      { name: 'Task Reminders', to: '/notifications/reminders', icon: Calendar, show: true },
      { name: 'Alert Preferences', to: '/notifications/settings', icon: ShieldCheck, show: true },
      { name: 'System Audit Log', to: '/notifications/activity-log', icon: Activity, show: true },
    ]},
    { group: 'Admin', items: [
      { name: 'Users', to: '/admin/users', icon: Users, show: hasPermission('users:read') },
      { name: 'Roles', to: '/admin/roles', icon: ShieldCheck, show: hasPermission('users:read') },
      { name: 'My Profile', to: '/profile', icon: User, show: true },
    ]}
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-slate-900 text-slate-100 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950/40 border-b border-slate-850">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500 text-slate-950 font-bold text-lg">
              R
            </div>
            <div>
              <span className="font-extrabold text-white uppercase tracking-wider text-sm">RIPOMA</span>
              <span className="text-teal-400 font-medium text-xs block -mt-1 font-sans">GLOBAL</span>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-slate-400 hover:text-white lg:hidden hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-4">
          {navigation.map((group) => (
            <div key={group.group}>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-3 mb-1.5">{group.group}</p>
              <div className="space-y-0.5">
                {group.items.filter(item => item.show).map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    end={item.to === '/inventory'}
                    onClick={() => { if (window.innerWidth < 1024) toggleSidebar(); }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                      }`
                    }
                  >
                    <item.icon size={15} className="shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 bg-slate-950/30 border-t border-slate-850">
          <div className="flex items-center gap-3 mb-4 px-2">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800"
              />
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-teal-500/10 text-teal-400 font-bold border border-teal-500/25">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider truncate">
                {user?.role}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-800 hover:bg-rose-900/40 hover:text-rose-200 text-slate-300 text-xs font-semibold rounded-lg transition-all duration-200 border border-slate-700 hover:border-rose-950/20"
          >
            <LogOut size={14} />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
