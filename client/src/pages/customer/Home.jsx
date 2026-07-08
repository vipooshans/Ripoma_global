import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import storefrontService from '../../services/storefront.service';
import {
  Search, ShoppingCart, User, ChevronRight, Star, Package,
  Globe, Truck, ShieldCheck, ArrowRight, Menu, X, Tag,
  Sparkles, TrendingUp, Clock, ChevronDown, LogOut, Heart,
  Zap, Award, BarChart3, Loader2
} from 'lucide-react';

// ─── Utility: format currency ─────────────────────────────────────────────────
const formatPrice = (price, currency = 'USD') => {
  if (!price && price !== 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2
  }).format(price);
};

// ─── Cart Context (simple in-memory) ──────────────────────────────────────────
const getCart = () => {
  try {
    return JSON.parse(localStorage.getItem('ripoma_cart') || '[]');
  } catch {
    return [];
  }
};
const saveCart = (cart) => {
  localStorage.setItem('ripoma_cart', JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// Product Card
const ProductCard = ({ product, onAddToCart }) => {
  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  const inStock = product.totalStock > 0;

  const handleAdd = (e) => {
    e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div
      className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/customer/products/${product.id}`)}
    >
      {/* Image area */}
      <div className="relative bg-gradient-to-br from-slate-50 to-teal-50/30 h-52 flex items-center justify-center overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
            <Package size={44} />
            <span className="text-xs font-medium text-slate-400">No image</span>
          </div>
        )}
        {/* Stock badge */}
        {!inStock && (
          <div className="absolute top-3 left-3 bg-slate-800/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
            Out of Stock
          </div>
        )}
        {inStock && (
          <div className="absolute top-3 left-3 bg-teal-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
            In Stock
          </div>
        )}
        {/* Wishlist */}
        <button className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100">
          <Heart size={14} />
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        {product.category && (
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
            {product.category.name}
          </span>
        )}
        <h3 className="font-bold text-slate-800 text-sm mt-1 leading-tight line-clamp-2 group-hover:text-teal-700 transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-slate-400 mt-1 font-mono">SKU: {product.sku}</p>

        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-lg font-extrabold text-slate-900">
              {formatPrice(product.sellingPrice, product.currency)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">per {product.unit}</p>
          </div>

          <button
            onClick={handleAdd}
            disabled={!inStock}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all duration-200 ${
              inStock
                ? added
                  ? 'bg-emerald-500 text-white scale-95'
                  : 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-105 shadow-sm shadow-teal-500/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {added ? (
              <>
                <ShieldCheck size={13} /> Added!
              </>
            ) : (
              <>
                <ShoppingCart size={13} /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Category Card
const CategoryCard = ({ category, onClick }) => {
  const icons = ['📦', '🔧', '⚙️', '🧴', '🖥️', '📱', '🎨', '🏗️', '🌿', '💡', '🚛', '🔬'];
  const icon = category.icon || icons[Math.abs(category.name.charCodeAt(0)) % icons.length];

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-teal-200 transition-all duration-300 text-center w-full"
    >
      <div className="w-14 h-14 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
        {icon}
      </div>
      <div>
        <p className="font-bold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{category.name}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{category.productCount} product{category.productCount !== 1 ? 's' : ''}</p>
      </div>
    </button>
  );
};

// Cart Drawer
const CartDrawer = ({ open, onClose, cart, onRemove, onUpdateQty }) => {
  const navigate = useNavigate();
  const total = cart.reduce((sum, item) => sum + item.sellingPrice * item.qty, 0);

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-teal-600" />
            <h3 className="font-extrabold text-slate-800">Your Cart</h3>
            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.length}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-8">
            <ShoppingCart size={48} className="text-slate-200" />
            <p className="font-semibold">Your cart is empty</p>
            <p className="text-xs text-center">Add products from the catalog to get started</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center text-slate-300 shrink-0 border border-slate-100">
                  {item.images?.[0] ? (
                    <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-xs leading-tight line-clamp-2">{item.name}</p>
                  <p className="text-teal-600 font-bold text-xs mt-1">{formatPrice(item.sellingPrice, item.currency)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onUpdateQty(item.id, item.qty - 1)}
                      className="w-5 h-5 bg-slate-200 rounded text-slate-600 text-xs font-bold flex items-center justify-center hover:bg-slate-300 transition-colors"
                    >
                      −
                    </button>
                    <span className="text-xs font-bold text-slate-800 w-5 text-center">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty(item.id, item.qty + 1)}
                      className="w-5 h-5 bg-slate-200 rounded text-slate-600 text-xs font-bold flex items-center justify-center hover:bg-slate-300 transition-colors"
                    >
                      +
                    </button>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="ml-auto text-rose-400 hover:text-rose-600 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div className="border-t border-slate-100 p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700 text-sm">Total</span>
              <span className="font-extrabold text-slate-900 text-lg">{formatPrice(total)}</span>
            </div>
            <Link
              to="/customer/login"
              onClick={onClose}
              className="btn-primary w-full py-3 text-sm"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

// Search Bar with suggestions
const SearchBar = ({ className = '' }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await storefrontService.getSearchSuggestions(q);
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
    setShowSuggestions(true);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/customer/products?search=${encodeURIComponent(query.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (s) => {
    navigate(`/customer/products/${s.id}`);
    setShowSuggestions(false);
    setQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="flex">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="storefront-search"
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search products, SKUs, categories…"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-l-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all placeholder:text-slate-400"
          />
          {loading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500 animate-spin" />
          )}
        </div>
        <button
          type="submit"
          className="px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-r-xl transition-colors duration-200 flex items-center gap-2 shrink-0"
        >
          Search
        </button>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onMouseDown={() => handleSuggestionClick(s)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors text-left border-b border-slate-50 last:border-0"
            >
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-slate-400">
                {s.image ? (
                  <img src={s.image} alt={s.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Package size={16} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                <p className="text-xs text-slate-400">{s.sku} · {formatPrice(s.sellingPrice, s.currency)}</p>
              </div>
              <ArrowRight size={13} className="text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Hero Section ─────────────────────────────────────────────────────────────
const HeroSection = ({ cartCount, onCartOpen, isAuthenticated, customerUser, onLogout }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Products', href: '/customer/products' },
    { label: 'Categories', href: '/customer/products?view=categories' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' }
  ];

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 overflow-hidden flex flex-col">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-slate-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 lg:px-12 py-5 border-b border-white/5">
        {/* Logo */}
        <Link to="/customer" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-500 text-slate-950 font-extrabold text-lg shadow-lg shadow-teal-500/30">
            R
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-wider leading-none text-white">RIPOMA</p>
            <span className="text-[9px] text-teal-400 font-bold tracking-widest uppercase">GLOBAL</span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className="text-sm font-medium text-slate-300 hover:text-teal-400 transition-colors duration-200"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Cart */}
          <button
            id="cart-icon-btn"
            onClick={onCartOpen}
            className="relative p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-bounce">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
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
                    My Profile
                  </Link>
                  <button
                    onClick={() => { onLogout(); setUserMenuOpen(false); }}
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
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10 transition-all duration-200"
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

          {/* Mobile menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl text-slate-300 hover:bg-white/10 transition-all"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="relative z-20 md:hidden bg-slate-900/95 border-b border-white/10 px-6 py-4 space-y-2">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-teal-400 py-2 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 lg:px-12 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-teal-500/15 border border-teal-500/30 rounded-full px-4 py-2 mb-8 text-teal-300 text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
            <Sparkles size={12} />
            Global Import & Export Marketplace
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            Source Quality Products{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-300">
              from Anywhere
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Discover a curated selection of global products. From electronics to industrial goods — browse, search, and order with confidence.
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-10">
            <SearchBar />
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              id="hero-browse-btn"
              to="/customer/products"
              className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-105 text-sm"
            >
              Browse Catalog <ArrowRight size={16} />
            </Link>
            {!isAuthenticated && (
              <Link
                to="/customer/register"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-200 border border-white/20 backdrop-blur-sm text-sm"
              >
                Create Free Account <ChevronRight size={16} />
              </Link>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-14 pt-10 border-t border-white/10">
            {[
              { icon: Package, label: 'Products', value: '500+' },
              { icon: Globe, label: 'Countries', value: '40+' },
              { icon: Truck, label: 'Fast Shipping', value: '48hr' },
              { icon: Award, label: 'Trusted by', value: '200+ Clients' }
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Icon size={18} className="text-teal-400 mb-1" />
                <span className="text-xl font-extrabold text-white">{value}</span>
                <span className="text-xs text-slate-500 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 flex justify-center pb-8">
        <div className="flex flex-col items-center gap-1 text-slate-500 animate-bounce">
          <span className="text-[10px] font-medium uppercase tracking-widest">Scroll</span>
          <ChevronDown size={16} />
        </div>
      </div>
    </section>
  );
};

// ─── Promo Banner ─────────────────────────────────────────────────────────────
const PromoBanner = () => (
  <section className="bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 py-4 overflow-hidden">
    <div className="flex items-center gap-16 animate-[marquee_20s_linear_infinite] whitespace-nowrap">
      {Array(3).fill(null).map((_, i) => (
        <div key={i} className="flex items-center gap-16 shrink-0">
          <span className="flex items-center gap-2 text-slate-950 text-sm font-bold">
            <Truck size={15} /> Free shipping on orders over $500
          </span>
          <span className="flex items-center gap-2 text-slate-950 text-sm font-bold">
            <ShieldCheck size={15} /> Verified quality standards
          </span>
          <span className="flex items-center gap-2 text-slate-950 text-sm font-bold">
            <Zap size={15} /> Same-day order processing
          </span>
          <span className="flex items-center gap-2 text-slate-950 text-sm font-bold">
            <Globe size={15} /> Worldwide delivery network
          </span>
        </div>
      ))}
    </div>
  </section>
);

// ─── Feature Highlights ────────────────────────────────────────────────────────
const FeatureHighlights = () => {
  const features = [
    {
      icon: Globe,
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      title: 'Global Sourcing',
      desc: 'Products curated from suppliers across 40+ countries, all quality-verified.'
    },
    {
      icon: Truck,
      color: 'from-teal-500 to-teal-600',
      bg: 'bg-teal-50',
      title: 'Fast Logistics',
      desc: 'Expedited freight options with real-time shipment tracking from door to door.'
    },
    {
      icon: ShieldCheck,
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      title: 'Secure Payments',
      desc: 'Industry-standard payment processing with buyer protection on every order.'
    },
    {
      icon: BarChart3,
      color: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-50',
      title: 'Order Analytics',
      desc: 'Track your order history, spending patterns, and shipment status in your portal.'
    }
  ];

  return (
    <section className="py-20 px-6 lg:px-12 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Why RIPOMA GLOBAL</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2">Built for Serious Buyers</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">
            A professional B2B marketplace designed for importers, distributors, and enterprise buyers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <div className={`w-6 h-6 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center`}>
                  <Icon size={13} className="text-white" />
                </div>
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1.5">{title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Main HomePage Component ───────────────────────────────────────────────────
const CustomerHome = () => {
  const { customerUser, isAuthenticated, logout } = useContext(CustomerAuthContext);
  const navigate = useNavigate();

  // Data
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cart
  const [cart, setCart] = useState(getCart());
  const [cartOpen, setCartOpen] = useState(false);

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  // Sync cart from localStorage
  useEffect(() => {
    const sync = () => setCart(getCart());
    window.addEventListener('cart-updated', sync);
    return () => window.removeEventListener('cart-updated', sync);
  }, []);

  // Fetch storefront data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [featuredData, catData, newData] = await Promise.all([
          storefrontService.getFeaturedProducts(8),
          storefrontService.getCategories(),
          storefrontService.getProducts({ sort: 'newest', limit: 4 })
        ]);
        setFeatured(featuredData.products || []);
        setCategories(catData.categories || []);
        setNewArrivals(newData.products || []);
      } catch (err) {
        console.error('Storefront data error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addToCart = (product) => {
    const current = getCart();
    const existing = current.find((i) => i.id === product.id);
    let updated;
    if (existing) {
      updated = current.map((i) =>
        i.id === product.id ? { ...i, qty: i.qty + 1 } : i
      );
    } else {
      updated = [...current, { ...product, qty: 1 }];
    }
    saveCart(updated);
    setCart(updated);
    setCartOpen(true);
  };

  const removeFromCart = (id) => {
    const updated = getCart().filter((i) => i.id !== id);
    saveCart(updated);
    setCart(updated);
  };

  const updateQty = (id, qty) => {
    if (qty < 1) {
      removeFromCart(id);
      return;
    }
    const updated = getCart().map((i) => (i.id === id ? { ...i, qty } : i));
    saveCart(updated);
    setCart(updated);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/customer/login');
  };

  return (
    <div className="min-h-screen bg-white" id="top">
      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onRemove={removeFromCart}
        onUpdateQty={updateQty}
      />

      {/* Hero Section (includes Navbar) */}
      <HeroSection
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
        isAuthenticated={isAuthenticated}
        customerUser={customerUser}
        onLogout={handleLogout}
      />

      {/* Promo Ticker */}
      <PromoBanner />

      {/* Categories Section */}
      {categories.length > 0 && (
        <section id="categories" className="py-20 px-6 lg:px-12 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Browse By</span>
                <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Product Categories</h2>
              </div>
              <Link
                to="/customer/products"
                className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array(5).fill(null).map((_, i) => (
                  <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories.slice(0, 10).map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onClick={() => navigate(`/customer/products?category=${cat.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section id="featured" className="py-20 px-6 lg:px-12 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp size={12} /> Featured
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 mt-1">Featured Products</h2>
              <p className="text-slate-500 text-sm mt-1">Our most popular products, ready to ship</p>
            </div>
            <Link
              to="/customer/products"
              className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
            >
              See All <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array(8).fill(null).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
                  <div className="h-52 bg-slate-100 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Package size={48} className="mx-auto mb-3 text-slate-200" />
              <p className="font-semibold">No products available yet</p>
              <p className="text-sm mt-1">Check back soon — we're adding new products regularly.</p>
            </div>
          )}

          {featured.length > 0 && (
            <div className="flex justify-center mt-10">
              <Link
                to="/customer/products"
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm"
              >
                Browse Full Catalog <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-20 px-6 lg:px-12 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={12} /> Just Added
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 mt-1">New Arrivals</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Feature Highlights */}
      <FeatureHighlights />

      {/* CTA Section */}
      <section id="about" className="py-24 px-6 lg:px-12 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/8 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-teal-500/15 border border-teal-500/30 rounded-full px-4 py-2 mb-6 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Star size={11} /> Trusted by 200+ Global Buyers
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to Start Sourcing?
          </h2>
          <p className="text-slate-400 mb-10 leading-relaxed">
            Create your free customer account to access exclusive pricing, manage orders, and track shipments in real time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isAuthenticated ? (
              <>
                <Link
                  id="cta-register-btn"
                  to="/customer/register"
                  className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/25 hover:scale-105 text-sm"
                >
                  Create Free Account <ArrowRight size={16} />
                </Link>
                <Link
                  to="/customer/login"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-200 border border-white/20 text-sm"
                >
                  Sign In <ChevronRight size={16} />
                </Link>
              </>
            ) : (
              <Link
                to="/customer/products"
                className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg text-sm"
              >
                Start Shopping <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-950 text-slate-400 py-12 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500 text-slate-950 font-extrabold text-base">
                  R
                </div>
                <div>
                  <p className="text-sm font-extrabold tracking-wider text-white leading-none">RIPOMA</p>
                  <span className="text-[9px] text-teal-400 font-bold tracking-widest uppercase">GLOBAL</span>
                </div>
              </div>
              <p className="text-xs leading-relaxed">
                Global import & export marketplace for businesses and buyers worldwide.
              </p>
            </div>

            {/* Products */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Products</h4>
              <ul className="space-y-2">
                {['Browse Catalog', 'Featured Items', 'New Arrivals', 'Categories'].map((l) => (
                  <li key={l}>
                    <Link to="/customer/products" className="text-xs hover:text-teal-400 transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Account</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Register', href: '/customer/register' },
                  { label: 'Sign In', href: '/customer/login' },
                  { label: 'My Profile', href: '/customer/profile' },
                  { label: 'Order History', href: '/customer/profile' }
                ].map((l) => (
                  <li key={l.label}>
                    <Link to={l.href} className="text-xs hover:text-teal-400 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Contact</h4>
              <ul className="space-y-2 text-xs">
                <li>support@ripomaglobal.com</li>
                <li>+1 (555) 019-2834</li>
                <li>Mon–Fri, 9am–6pm EST</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs">© {new Date().getFullYear()} RIPOMA GLOBAL Inc. All rights reserved.</p>
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck size={12} className="text-teal-500" />
              Secure & Verified Platform
            </div>
          </div>
        </div>
      </footer>

      {/* Marquee animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
};

export default CustomerHome;
