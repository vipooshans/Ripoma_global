import React, { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '../../hooks/useAuth';
import { Menu as MenuIcon, User, LogOut, Settings, Bell, ChevronDown } from 'lucide-react';

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200 shadow-sm">
      {/* Left side: Hamburger and title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors"
        >
          <MenuIcon size={20} />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-slate-800 lg:text-base hidden sm:block">
            Management Panel
          </h2>
        </div>
      </div>

      {/* Right side: Notifications and Profile Dropdown */}
      <div className="flex items-center gap-4">
        {/* Notification bell mock */}
        <button className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-teal-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-slate-250"></div>

        {/* Profile Dropdown */}
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/20">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-slate-100"
              />
            ) : (
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500 text-slate-950 font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-700 leading-none">{user?.name}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                {user?.role}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 z-50 w-52 mt-2 origin-top-right bg-white rounded-xl shadow-xl border border-slate-150 ring-1 ring-black/5 divide-y divide-slate-100 focus:outline-none overflow-hidden">
              <div className="px-4 py-3 bg-slate-50/50">
                <p className="text-xs text-slate-400 font-medium">Logged in as</p>
                <p className="text-xs font-bold text-slate-700 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => navigate('/profile')}
                      className={`flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors ${
                        active ? 'bg-slate-50 text-slate-900' : 'text-slate-650'
                      }`}
                    >
                      <User size={16} className="text-slate-400" />
                      <span>View Profile</span>
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => navigate('/profile')} // maps to profile password settings
                      className={`flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors ${
                        active ? 'bg-slate-50 text-slate-900' : 'text-slate-650'
                      }`}
                    >
                      <Settings size={16} className="text-slate-400" />
                      <span>Security Settings</span>
                    </button>
                  )}
                </Menu.Item>
              </div>

              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={logout}
                      className={`flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors ${
                        active ? 'bg-rose-50 text-rose-600' : 'text-slate-650'
                      }`}
                    >
                      <LogOut size={16} className="text-rose-450" />
                      <span className="font-medium">Logout</span>
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
};

export default Navbar;
