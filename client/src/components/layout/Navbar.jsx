import React, { Fragment, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { useAuth } from '../../hooks/useAuth';
import {
  Menu as MenuIcon,
  User,
  LogOut,
  Settings,
  Bell,
  ChevronDown,
  Search,
  X,
  Package,
  Truck,
  FileText,
  Users,
  Loader2,
} from 'lucide-react';
import NotificationBell from '../notifications/NotificationBell';
import api from '../../services/api';

const useDebounce = (callback, delay) => {
  const timer = useRef(null);
  return useCallback(
    (...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );
};

const resultIcon = (subtitle = '') => {
  const s = subtitle.toLowerCase();
  if (s.includes('import') || s.includes('export') || s.includes('order'))
    return <FileText size={13} className="text-slate-400" />;
  if (s.includes('shipment')) return <Truck size={13} className="text-slate-400" />;
  if (s.includes('product')) return <Package size={13} className="text-slate-400" />;
  if (s.includes('customer') || s.includes('supplier'))
    return <Users size={13} className="text-slate-400" />;
  return <Search size={13} className="text-slate-400" />;
};

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults(null); setSearching(false); return; }
    setSearching(true);
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`);
      setResults(data.results);
    } catch {
      setResults(null);
    } finally {
      setSearching(false);
    }
  }, []);

  const debouncedSearch = useDebounce(runSearch, 350);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) { setResults(null); setSearching(false); return; }
    setSearching(true);
    debouncedSearch(val);
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    inputRef.current?.focus();
  };

  const handleResultClick = (url) => {
    setQuery('');
    setResults(null);
    setFocused(false);
    navigate(url);
  };

  const allResults = results
    ? [
        ...(results.orders || []),
        ...(results.shipments || []),
        ...(results.products || []),
        ...(results.contacts || []),
      ]
    : [];

  const showDropdown = focused && (searching || allResults.length > 0 || (query.length > 1 && results !== null));

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200 shadow-sm">
      {/* Left side: Hamburger + Search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors shrink-0"
        >
          <MenuIcon size={20} />
        </button>

        {/* Global Search */}
        <div className="relative w-full max-w-sm">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-400/15 transition-all">
            {searching ? (
              <Loader2 size={15} className="text-slate-400 animate-spin shrink-0" />
            ) : (
              <Search size={15} className="text-slate-400 shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              placeholder="Search orders, products, contacts…"
              className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none min-w-0"
            />
            {query && (
              <button onClick={clearSearch} className="text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Results dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {searching && allResults.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                  <Loader2 size={14} className="animate-spin" />
                  Searching…
                </div>
              ) : allResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No results for "<span className="font-semibold">{query}</span>"
                </div>
              ) : (
                <div className="py-1">
                  {allResults.map((r) => (
                    <button
                      key={r.id}
                      onMouseDown={() => handleResultClick(r.url)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                        {resultIcon(r.subtitle)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{r.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{r.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Notifications and Profile Dropdown */}
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {/* Notification bell */}
        <NotificationBell />

        {/* Vertical divider */}
        <div className="h-6 w-px bg-slate-200"></div>

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
                      onClick={() => navigate('/profile')}
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
