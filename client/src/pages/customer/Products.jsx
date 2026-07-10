import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import storefrontService from '../../services/storefront.service';
import { useStorefront } from '../../components/storefront/CustomerStorefrontLayout';
import ProductCard from '../../components/storefront/ProductCard';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import {
  Package, Filter, ChevronRight, ArrowLeft, Grid, List,
  SlidersHorizontal, X, Home, ArrowRight
} from 'lucide-react';

const CustomerProducts = () => {
  const { addToCart } = useStorefront();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    storefrontService.getCategories().then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await storefrontService.getProducts({ search, category, sort, page, limit: 12 });
        setProducts(data.products || []);
        setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
      } catch (err) {
        console.error(err);
        toast.error('Failed to load products. Please try again.');
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

  const selectedCategory = categories.find((c) => c.id === category);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-slate-400 w-full">
        <Link to="/customer" className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <Home size={11} /> Home
        </Link>
        <ChevronRight size={11} />
        <span className="text-slate-600 font-medium">Products</span>
        {selectedCategory && (
          <>
            <ChevronRight size={11} />
            <span className="text-teal-600 font-bold">{selectedCategory.name}</span>
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12 flex gap-6 flex-1 w-full">
        <aside className="shrink-0 w-60 hidden lg:block">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 sticky top-24 space-y-6">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-teal-600" />
              Filters
            </h3>

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
                    type="button"
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

            {categories.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Categories</p>
                <div className="space-y-1">
                  <button
                    type="button"
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
                      type="button"
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
                type="button"
                onClick={() => setSearchParams({})}
                className="w-full flex items-center justify-center gap-2 text-xs text-rose-600 hover:text-rose-700 font-bold py-2 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <X size={12} /> Clear All Filters
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-extrabold text-slate-800">
                {search ? `Results for "${search}"` : selectedCategory ? selectedCategory.name : 'All Products'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">{pagination.total} product{pagination.total !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
              >
                <Filter size={13} /> Filters
              </button>
              <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1">
                <button type="button" onClick={() => setView('grid')} className={`p-1.5 rounded-lg transition-colors ${view === 'grid' ? 'bg-teal-100 text-teal-700' : 'text-slate-400 hover:text-slate-600'}`} aria-label="Grid view">
                  <Grid size={15} />
                </button>
                <button type="button" onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-teal-100 text-teal-700' : 'text-slate-400 hover:text-slate-600'}`} aria-label="List view">
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="lg:hidden mb-4 p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs font-bold text-slate-600">Sort & Category filters — use sidebar on desktop</p>
              <button type="button" onClick={() => setShowFilters(false)} className="text-xs text-teal-600 font-bold">Close</button>
            </div>
          )}

          {(search || category) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {search && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full border border-teal-200">
                  Search: {search}
                  <button type="button" onClick={() => updateParam('search', '')} className="hover:text-rose-500 transition-colors"><X size={11} /></button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full border border-teal-200">
                  {selectedCategory.name}
                  <button type="button" onClick={() => updateParam('category', '')} className="hover:text-rose-500 transition-colors"><X size={11} /></button>
                </span>
              )}
            </div>
          )}

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
                <ProductCard key={p.id} product={p} onAddToCart={(prod) => addToCart(prod, false)} view={view} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400">
              <Package size={56} className="mx-auto mb-4 text-slate-200" />
              <p className="font-bold text-slate-600 text-lg">No products found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
              <button type="button" onClick={() => setSearchParams({})} className="mt-5 text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1.5 mx-auto">
                <X size={14} /> Clear filters
              </button>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                type="button"
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
                          type="button"
                          onClick={() => updateParam('page', String(n))}
                          className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                            n === page ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-600'
                          }`}
                        >
                          {n}
                        </button>
                  )}
              </div>
              <button
                type="button"
                onClick={() => updateParam('page', String(page + 1))}
                disabled={page >= pagination.totalPages}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white"
              >
                Next <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerProducts;
