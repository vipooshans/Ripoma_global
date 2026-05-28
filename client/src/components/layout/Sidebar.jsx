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
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout, hasPermission } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      to: '/admin/dashboard',
      icon: LayoutDashboard,
      show: true
    },
    {
      name: 'User Management',
      to: '/admin/users',
      icon: Users,
      show: hasPermission('users:read')
    },
    {
      name: 'Roles & Permissions',
      to: '/admin/roles',
      icon: ShieldCheck,
      show: hasPermission('users:read') // Limit roles page to administrators/managers with user management access
    },
    {
      name: 'My Profile',
      to: '/profile',
      icon: User,
      show: true
    }
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
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map(
            (item) =>
              item.show && (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={() => {
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-700/20'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                    }`
                  }
                >
                  <item.icon size={18} className="shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              )
          )}
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
