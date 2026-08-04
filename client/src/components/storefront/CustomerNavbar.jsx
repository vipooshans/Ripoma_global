import React, { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart, User, Menu, X, ChevronDown, LogOut, Package, Heart
} from 'lucide-react';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import SearchBar from './SearchBar';
import CustomerNotificationBell from './CustomerNotificationBell';

const NAV_LINKS = [
  { label: 'Products', href: '/customer/products' },
  { label: 'Categories', href: '/customer/categories' },
  { label: 'About', href: '/customer#about' },
  { label: 'Help', href: '/customer/help' },
  { label: 'Contact', href: '/customer#contact' }
];

const CustomerNavbar = ({
  variant = 'solid',
  cartCount = 0,
  wishlistCount = 0,
  onCartOpen,
  onLogout,
  showSearch = false
}) => {
  const { customerUser, isAuthenticated } = useContext(CustomerAuthContext);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isTransparent = variant === 'transparent';
  const isHome = location.pathname === '/customer';

  const navClass = isTransparent
    ? 'relative z-20 border-b border-white/5 bg-transparent'
    : 'sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm';

  const linkClass = isTransparent
    ? 'text-sm font-medium text-slate-300 hover:text-teal-400 transition-colors duration-200'
    : 'text-sm font-medium text-slate-600 hover:text-teal-600 transition-colors duration-200';

  const iconBtnClass = isTransparent
    ? 'relative p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200'
    : 'relative p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all duration-200';

  const handleNavClick = (href) => {
    setMobileMenuOpen(false);
    if (href.startsWith('/customer#') && isHome) {
      const id = href.split('#')[1];
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={navClass}>
      <nav className="flex items-center justify-between px-4 lg:px-8 py-4 max-w-7xl mx-auto gap-4" aria-label="Main navigation">
        <Link to="/customer" className="flex items-center shrink-0">
          <img
            src={isTransparent ? '/logo-white.svg' : '/logo.svg'}
            alt="RIPOMA GLOBAL TRADING (PVT) LTD"
            className="h-11 w-auto"
          />
        </Link>

        {showSearch && (
          <div className="hidden md:flex flex-1 max-w-xl">
            <SearchBar compact className="w-full" />
          </div>
        )}

        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              onClick={() => handleNavClick(l.href)}
              className={linkClass}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CustomerNotificationBell iconBtnClass={iconBtnClass} />

          <Link
            to="/customer/wishlist"
            className={iconBtnClass}
            aria-label={`Wishlist, ${wishlistCount} items`}
          >
            <Heart size={20} className={wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : ''} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {wishlistCount > 9 ? '9+' : wishlistCount}
              </span>
            )}
          </Link>

          <button
            id="cart-icon-btn"
            type="button"
            onClick={onCartOpen}
            className={iconBtnClass}
            aria-label={`Shopping cart, ${cartCount} items`}
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isTransparent ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
                }`}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-slate-950 font-extrabold text-xs">
                  {customerUser?.firstName?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <span className="hidden sm:block">{customerUser?.firstName}</span>
                <ChevronDown size={14} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30">
                  <Link
                    to="/customer/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                  >
                    <User size={14} />
                    Account
                  </Link>
                  <Link
                    to="/customer/orders"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                  >
                    <Package size={14} />
                    Orders
                  </Link>
                  <Link
                    to="/customer/wishlist"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                  >
                    <Heart size={14} />
                    Wishlist
                  </Link>
                  <button
                    type="button"
                    onClick={() => { onLogout?.(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-100"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/customer/login"
                className={`text-sm font-medium px-3 py-2 rounded-xl transition-all duration-200 ${
                  isTransparent ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Sign In
              </Link>
              <Link
                id="hero-register-btn"
                to="/customer/register"
                className="text-sm font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/25"
              >
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2.5 rounded-xl transition-all ${isTransparent ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className={`md:hidden px-4 pb-4 space-y-2 border-b ${isTransparent ? 'bg-slate-900/95 border-white/10' : 'bg-white border-slate-200'}`}>
          {showSearch && (
            <div className="py-2 md:hidden">
              <SearchBar compact />
            </div>
          )}
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              onClick={() => handleNavClick(l.href)}
              className={`block text-sm font-medium py-2 transition-colors ${
                isTransparent ? 'text-slate-300 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/customer/wishlist"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 text-sm font-medium py-2 transition-colors ${
              isTransparent ? 'text-slate-300 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
            }`}
          >
            <Heart size={14} />
            Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ''}
          </Link>
        </div>
      )}
    </header>
  );
};

export default CustomerNavbar;
