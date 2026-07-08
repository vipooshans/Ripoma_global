import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import storefrontService from '../../services/storefront.service';
import {
  Search, ShoppingCart, Package, Filter, ChevronRight,
  ArrowLeft, Grid, List, SlidersHorizontal, X, Home,
  ShieldCheck, Loader2, ArrowRight, User
} from 'lucide-react';

const formatPrice = (price, currency = 'USD') => {
  if (!price && price !== 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2
  }).format(price);
};

const getCart = () => {
  try { return JSON.parse(localStorage.getItem('ripoma_cart') || '[]'); } catch { return []; }
};
const saveCart = (cart) => {
  localStorage.setItem('ripoma_cart', JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
};

const ProductCard = ({ product, onAddToCart, view }) => {
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const inStock = product.totalStock > 0;

  const handleAdd = (e) => {
    e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  if (view === 'list') {
    return (
      <div
        className="flex gap-4 bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-teal-200 transition-all duration-200 cursor-pointer group"
        onClick={() => navigate(`/customer/products/${product.id}`)}
      >
        <div className="w-24 h-24 bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : <Package size={28} className="text-slate-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              {product.category && <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{product.category.name}</span>}
              <h3 className="font-bold text-slate-800 text-sm mt-0.5 group-hover:text-teal-700 transition-colors">{product.name}</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">{product.sku}</p>
              {product.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{product.description}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-extrabold text-slate-900">{formatPrice(product.sellingPrice, product.currency)}</p>
              <p className="text-[10px] text-slate-400">per {product.unit}</p>
              <button
                onClick={handleAdd}
                disabled={!inStock}
                className={`mt-2 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  inStock
                    ? added ? 'bg-emerald-500 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {added ? <><ShieldCheck size={12} /> Added!</> : <><ShoppingCart size={12} /> Add to Cart</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => navigate(`/customer/products/${product.id}`)}
    >
      <div className="relative bg-gradient-to-br from-slate-50 to-teal-50/30 h-48 flex items-center justify-center overflow-hidden">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : <Package size={40} className="text-slate-300" />}
        {!inStock && (
          <div className="absolute top-3 left-3 bg-slate-800/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">Out of Stock</div>
        )}
        {inStock && (
          <div className="absolute top-3 left-3 bg-teal-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">In Stock</div>
        )}
      </div>
      <div className="p-4">
        {product.category && <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{product.category.name}</span>}
        <h3 className="font-bold text-slate-800 text-sm mt-1 leading-tight line-clamp-2 group-hover:text-teal-700 transition-colors">{product.name}</h3>
        <p className="text-[10px] text-slate-400 mt-1 font-mono">{product.sku}</p>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-base font-extrabold text-slate-900">{formatPrice(product.sellingPrice, product.currency)}</p>
            <p className="text-[10px] text-slate-400">per {product.unit}</p>
          </div>
          <button
            onClick={handleAdd}
            disabled={!inStock}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all duration-200 ${
              inStock
                ? added ? 'bg-emerald-500 text-white scale-95' : 'bg-teal-600 hover:bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {added ? <><ShieldCheck size={12} />Added!</> : <><ShoppingCart size={12} />Add</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerProducts = () => {
  const { customerUser, isAuthenticated } = useContext(CustomerAuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(getCart());
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  useEffect(() => {
    const sync = () => setCart(getCart());
    window.addEventListener('cart-updated', sync);
    return () => window.removeEventListener('cart-updated', sync);
  }, []);

  // Load categories once
  useEffect(() => {
    storefrontService.getCategories().then((d) => setCategories(d.categories || []));
  }, []);

  // Load products on filter change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await storefrontService.getProducts({ search, category, sort, page, limit: 12 });
        setProducts(data.products || []);
        setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [search, category, sort, page]);

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  const addToCart = (product) => {
    const current = getCart();
    const existing = current.find((i) => i.id === product.id);
    const updated = existing
      ? current.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      : [...current, { ...product, qty: 1 }];
    saveCart(updated);
    setCart(updated);
  };

  const selectedCategory = categories.find((c) => c.id === category);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/customer" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-teal-500 text-slate-950 font-extrabold text-base flex items-center justify-center shadow-sm">R</div>
            <div className="hidden sm:block">
              <p className="text-sm font-extrabold tracking-wider leading-none text-slate-800">RIPOMA</p>
              <span className="text-[9px] text-teal-600 font-bold tracking-widest uppercase">GLOBAL</span>
            </div>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <form onSubmit={(e) => { e.preventDefault(); updateParam('search', e.target.s.value); }}>
              <div className="relative flex">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  name="s"
                  defaultValue={search}
                  key={search}
                  placeholder="Search products…"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-l-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all placeholder:text-slate-400"
                />
                <button type="submit" className="px-4 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-r-xl transition-colors shrink-0">
                  Go
                </button>
              </div>
            </form>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Cart */}
            <button onClick={() => navigate('/customer')} className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-all">
              <Home size={18} />
            </button>
            <button onClick={() => setCartOpen(!cartOpen)} className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-all">
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
            {isAuthenticated ? (
              <Link to="/customer/profile" className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-all">
                <User size={18} />
              </Link>
            ) : (
              <Link to="/customer/login" className="text-xs font-bold bg-teal-600 text-white px-3 py-2 rounded-xl hover:bg-teal-700 transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-slate-400">
        <Link to="/customer" className="hover:text-teal-600 transition-colors flex items-center gap-1"><Home size={11} /> Home</Link>
        <ChevronRight size={11} />
        <span className="text-slate-600 font-medium">Products</span>
        {selectedCategory && (
          <>
            <ChevronRight size={11} />
            <span className="text-teal-600 font-bold">{selectedCategory.name}</span>
          </>
        )}
      </div>

      <main className="max-w-7xl mx-auto px-4 pb-12 flex gap-6">
        {/* Sidebar Filters */}
        <aside className={`shrink-0 w-60 hidden lg:block`}>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 sticky top-20 space-y-6">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-teal-600" />
              Filters
            </h3>

            {/* Sort */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Sort By</p>
              <div className="space-y-1">
                {[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'price_asc', label: 'Price: Low → High' },
                  { value: 'price_desc', label: 'Price: High → Low' },
                  { value: 'name_asc', label: 'Name A–Z' }
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => updateParam('sort', s.value)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                      sort === s.value ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Categories</p>
                <div className="space-y-1">
                  <button
                    onClick={() => updateParam('category', '')}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                      !category ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateParam('category', cat.id)}
                      className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                        category === cat.id ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-slate-400">{cat.productCount}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(search || category) && (
              <button
                onClick={() => setSearchParams({})}
                className="w-full flex items-center justify-center gap-2 text-xs text-rose-600 hover:text-rose-700 font-bold py-2 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <X size={12} /> Clear All Filters
              </button>
            )}
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-extrabold text-slate-800">
                {search ? `Results for "${search}"` : selectedCategory ? selectedCategory.name : 'All Products'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">{pagination.total} product{pagination.total !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
              >
                <Filter size={13} /> Filters
              </button>
              <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1">
                <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg transition-colors ${view === 'grid' ? 'bg-teal-100 text-teal-700' : 'text-slate-400 hover:text-slate-600'}`}>
                  <Grid size={15} />
                </button>
                <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-teal-100 text-teal-700' : 'text-slate-400 hover:text-slate-600'}`}>
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Active filters chips */}
          {(search || category) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {search && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full border border-teal-200">
                  Search: {search}
                  <button onClick={() => updateParam('search', '')} className="hover:text-rose-500 transition-colors"><X size={11} /></button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full border border-teal-200">
                  {selectedCategory.name}
                  <button onClick={() => updateParam('category', '')} className="hover:text-rose-500 transition-colors"><X size={11} /></button>
                </span>
              )}
            </div>
          )}

          {/* Products */}
          {loading ? (
            <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5' : 'space-y-3'}>
              {Array(9).fill(null).map((_, i) => (
                view === 'grid'
                  ? <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100"><div className="h-48 bg-slate-100 animate-pulse" /><div className="p-4 space-y-2"><div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" /><div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" /></div></div>
                  : <div key={i} className="bg-white rounded-xl h-28 border border-slate-100 animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5' : 'space-y-3'}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onAddToCart={addToCart} view={view} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400">
              <Package size={56} className="mx-auto mb-4 text-slate-200" />
              <p className="font-bold text-slate-600 text-lg">No products found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
              <button onClick={() => setSearchParams({})} className="mt-5 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1.5 mx-auto">
                <X size={14} /> Clear filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => updateParam('page', String(page - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white"
              >
                <ArrowLeft size={13} /> Prev
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === pagination.totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, idx) =>
                    n === '...'
                      ? <span key={`ellipsis-${idx}`} className="text-xs text-slate-400 px-1">…</span>
                      : <button
                          key={n}
                          onClick={() => updateParam('page', String(n))}
                          className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                            n === page ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-600'
                          }`}
                        >
                          {n}
                        </button>
                  )
                }
              </div>
              <button
                onClick={() => updateParam('page', String(page + 1))}
                disabled={page >= pagination.totalPages}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white"
              >
                Next <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomerProducts;
