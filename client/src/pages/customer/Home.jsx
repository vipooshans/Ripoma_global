import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import { useStorefront } from '../../components/storefront/CustomerStorefrontLayout';
import storefrontService from '../../services/storefront.service';
import CustomerNavbar from '../../components/storefront/CustomerNavbar';
import SearchBar from '../../components/storefront/SearchBar';
import PromoBanner from '../../components/storefront/PromoBanner';
import CategoryCard from '../../components/storefront/CategoryCard';
import ProductCard from '../../components/storefront/ProductCard';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import {
  Sparkles, ArrowRight, ChevronRight, ChevronDown, Star,
  Globe, Truck, ShieldCheck, Award, BarChart3,
  TrendingUp, Clock, Package
} from 'lucide-react';

const ProductGridSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
    {Array(count).fill(null).map((_, i) => (
      <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
        <div className="h-40 sm:h-52 bg-slate-100 animate-pulse" />
        <div className="p-4 space-y-2">
          <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

const CategoryGridSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
    {Array(5).fill(null).map((_, i) => (
      <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
    ))}
  </div>
);

const FeatureHighlights = () => {
  const features = [
    { icon: Globe, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', title: 'Global Sourcing', desc: 'Products curated from suppliers worldwide, all quality-verified.' },
    { icon: Truck, color: 'from-teal-500 to-teal-600', bg: 'bg-teal-50', title: 'Fast Logistics', desc: 'Expedited freight options with real-time shipment tracking.' },
    { icon: ShieldCheck, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', title: 'Secure Checkout', desc: 'Encrypted account login, no card numbers stored, and honest payment options including COD and bank transfer.' },
    { icon: BarChart3, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', title: 'Order Analytics', desc: 'Track order history and shipment status in your portal.' }
  ];

  return (
    <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-slate-50" aria-labelledby="why-us-heading">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Why RIPOMA GLOBAL</span>
          <h2 id="why-us-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">Built for Serious Buyers</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">
            A professional B2C marketplace designed for customers who value quality products and reliable delivery.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className={`w-11 h-11 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-3 sm:mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={19} className="text-white" />
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

const CustomerHome = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useContext(CustomerAuthContext);
  const { cartCount, wishlistCount, setCartOpen, addToCart } = useStorefront();

  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [stats, setStats] = useState({ productCount: 0, categoryCount: 0 });
  const [promos, setPromos] = useState({ marquee: [], cards: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [featuredData, catData, newData, statsData, promosData] = await Promise.all([
          storefrontService.getFeaturedProducts(8),
          storefrontService.getCategories(),
          storefrontService.getProducts({ sort: 'newest', limit: 4 }),
          storefrontService.getStats(),
          storefrontService.getPromos()
        ]);
        setFeatured(featuredData.products || []);
        setCategories(catData.categories || []);
        setNewArrivals(newData.products || []);
        setStats(statsData.stats || { productCount: 0, categoryCount: 0 });
        setPromos(promosData.promos || { marquee: [], cards: [] });
      } catch (err) {
        console.error('Storefront data error:', err);
        setError('Unable to load storefront data. Please try again later.');
        toast.error('Failed to load products. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const formatStat = (n) => (n >= 100 ? `${Math.floor(n / 50) * 50}+` : n > 0 ? `${n}+` : '—');

  return (
    <div className="min-h-screen bg-white" id="top">
      {/* Hero */}
      <section className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 overflow-hidden flex flex-col">
        <div className="absolute inset-0 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1920&q=70"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-teal-950/90" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <CustomerNavbar
          variant="transparent"
          cartCount={cartCount}
          wishlistCount={wishlistCount}
          onCartOpen={() => setCartOpen(true)}
          onLogout={handleLogout}
        />

        <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-teal-500/15 border border-teal-500/30 rounded-full px-3.5 sm:px-4 py-2 mb-6 sm:mb-8 text-teal-300 text-[10px] sm:text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
              <Sparkles size={12} />
              Global Import & Export Marketplace
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5 sm:mb-6">
              Source Quality Products{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-300">from Anywhere</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10">
              Discover a curated selection of global products. From electronics to industrial goods — browse, search, and order with confidence.
            </p>

            <div className="max-w-xl mx-auto mb-10">
              <SearchBar />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                id="hero-browse-btn"
                to="/customer/products"
                className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/25 hover:scale-105 text-sm"
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

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-6 sm:gap-8 mt-10 sm:mt-14 pt-8 sm:pt-10 border-t border-white/10">
              {[
                { icon: Package, label: 'Products', value: formatStat(stats.productCount) },
                { icon: Globe, label: 'Categories', value: formatStat(stats.categoryCount) },
                { icon: Truck, label: 'Fast Shipping', value: '48hr' },
                { icon: Award, label: 'Trusted Platform', value: 'B2C' }
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

        <div className="relative z-10 flex justify-center pb-8">
          <div className="flex flex-col items-center gap-1 text-slate-500 animate-bounce">
            <span className="text-[10px] font-medium uppercase tracking-widest">Scroll</span>
            <ChevronDown size={16} />
          </div>
        </div>
      </section>

      <PromoBanner promos={promos} />

      {error && (
        <div className="max-w-6xl mx-auto px-6 py-4">
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-center">{error}</p>
        </div>
      )}

      {/* Categories */}
      <section id="categories" className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-white" aria-labelledby="categories-heading">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-3 mb-7 sm:mb-10">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">Browse By</span>
              <h2 id="categories-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Product Categories</h2>
            </div>
            <Link to="/customer/categories" className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors shrink-0 mb-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <CategoryGridSkeleton />
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {categories.slice(0, 10).map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onClick={() => {
                    if (cat.subcategories?.length > 0) {
                      navigate(`/customer/categories/${cat.id}`);
                    } else {
                      navigate(`/customer/products?category=${cat.id}`);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Package size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="font-semibold text-sm">No categories available yet</p>
              <a href="mailto:support@ripomaglobal.com" className="text-teal-600 text-xs font-bold mt-2 inline-block hover:underline">Contact support</a>
            </div>
          )}
        </div>
      </section>

      {/* Featured */}
      <section id="featured" className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-slate-50" aria-labelledby="featured-heading">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-3 mb-7 sm:mb-10">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp size={12} /> Featured
              </span>
              <h2 id="featured-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Featured Products</h2>
              <p className="hidden sm:block text-slate-500 text-sm mt-1">Our most popular products, ready to ship</p>
            </div>
            <Link to="/customer/products" className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors shrink-0 mb-1">
              See All <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Package size={48} className="mx-auto mb-3 text-slate-200" />
              <p className="font-semibold">No products available yet</p>
              <p className="text-sm mt-1">Check back soon — we&apos;re adding new products regularly.</p>
              <Link to="/customer/products" className="text-teal-600 text-sm font-bold mt-4 inline-block hover:underline">Browse catalog</Link>
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      {!loading && newArrivals.length > 0 && (
        <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-12 bg-white" aria-labelledby="new-arrivals-heading">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between gap-3 mb-7 sm:mb-10">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={12} /> Just Added
                </span>
                <h2 id="new-arrivals-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">New Arrivals</h2>
              </div>
              <Link to="/customer/products?sort=newest" className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors shrink-0 mb-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
              ))}
            </div>
          </div>
        </section>
      )}

      <FeatureHighlights />

      {/* CTA */}
      <section id="about" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-teal-500/15 border border-teal-500/30 rounded-full px-4 py-2 mb-6 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Star size={11} /> Trusted Global Marketplace
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">Ready to Start Sourcing?</h2>
          <p className="text-slate-400 mb-10 leading-relaxed">
            Create your free customer account to access exclusive pricing, manage orders, and track shipments in real time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isAuthenticated ? (
              <>
                <Link id="cta-register-btn" to="/customer/register" className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/25 hover:scale-105 text-sm">
                  Create Free Account <ArrowRight size={16} />
                </Link>
                <Link to="/customer/login" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-200 border border-white/20 text-sm">
                  Sign In <ChevronRight size={16} />
                </Link>
              </>
            ) : (
              <Link to="/customer/products" className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg text-sm">
                Start Shopping <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </section>

      <CustomerFooter />
    </div>
  );
};

export default CustomerHome;
