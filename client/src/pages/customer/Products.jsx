import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import storefrontService from '../../services/storefront.service';
import { useStorefront } from '../../components/storefront/CustomerStorefrontLayout';
import ProductCard from '../../components/storefront/ProductCard';
import ProductFiltersPanel from '../../components/storefront/ProductFiltersPanel';
import SearchBar from '../../components/storefront/SearchBar';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import { findStorefrontCategory } from '../../utils/categoryUtils';
import {
  Package, Filter, ChevronRight, ArrowLeft, Grid, List,
  SlidersHorizontal, X, Home, ArrowRight
} from 'lucide-react';

const CustomerProducts = () => {
  const { addToCart } = useStorefront();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [facets, setFacets] = useState({ brands: [], priceRange: { min: 0, max: 0 } });
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const brand = searchParams.get('brand') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const availability = searchParams.get('availability') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const viewParam = searchParams.get('view');

  const [mobileDraft, setMobileDraft] = useState({
    sort, category, brand, minPrice, maxPrice, availability
  });

  useEffect(() => {
    if (viewParam === 'categories') {
      navigate('/customer/categories', { replace: true });
    }
  }, [viewParam, navigate]);

  useEffect(() => {
    storefrontService.getCategories().then((d) => setCategories(d.categories || [])).catch(() => {});
  }, []);

  const facetParams = useMemo(() => ({
    search: search || undefined,
    category: category || undefined
  }), [search, category]);

  useEffect(() => {
    storefrontService.getProductFacets(facetParams)
      .then(setFacets)
      .catch(() => {});
  }, [facetParams]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {
          search: search || undefined,
          category: category || undefined,
          sort,
          page,
          limit: 12,
          brand: brand || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          availability: availability || undefined
        };
        const data = await storefrontService.getProducts(params);
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
  }, [search, category, sort, page, brand, minPrice, maxPrice, availability]);

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  const applyMultipleParams = (updates) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete('page');
    setSearchParams(params);
  };

  const clearAllFilters = () => setSearchParams({});

  const hasActiveFilters = Boolean(search || category || brand || minPrice || maxPrice || availability);

  const selectedCategory = category ? findStorefrontCategory(categories, category) : null;

  const openMobileFilters = () => {
    setMobileDraft({ sort, category, brand, minPrice, maxPrice, availability });
    setShowFilters(true);
  };

  const applyMobileFilters = () => {
    applyMultipleParams(mobileDraft);
    setShowFilters(false);
  };

  const filterPanelProps = {
    categories,
    brands: facets.brands || [],
    priceRange: facets.priceRange || { min: 0, max: 0 },
    hasActiveFilters
  };

  const desktopFilters = (
    <ProductFiltersPanel
      {...filterPanelProps}
      sort={sort}
      category={category}
      brand={brand}
      minPrice={minPrice}
      maxPrice={maxPrice}
      availability={availability}
      onSortChange={(v) => updateParam('sort', v)}
      onCategoryChange={(v) => updateParam('category', v)}
      onBrandChange={(v) => updateParam('brand', v)}
      onMinPriceChange={(v) => updateParam('minPrice', v)}
      onMaxPriceChange={(v) => updateParam('maxPrice', v)}
      onAvailabilityChange={(v) => updateParam('availability', v)}
      onClearAll={clearAllFilters}
    />
  );

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
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 sticky top-24">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mb-6">
              <SlidersHorizontal size={15} className="text-teal-600" />
              Filters
            </h3>
            {desktopFilters}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <SearchBar
              compact
              className="w-full max-w-xl"
              initialQuery={search}
              onSearch={(q) => updateParam('search', q)}
            />
          </div>

          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-extrabold text-slate-800">
                {search
                  ? `${pagination.total} result${pagination.total !== 1 ? 's' : ''} for "${search}"`
                  : selectedCategory
                    ? selectedCategory.name
                    : 'All Products'}
              </h1>
              {!search && (
                <p className="text-xs text-slate-400 mt-0.5">{pagination.total} product{pagination.total !== 1 ? 's' : ''} found</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openMobileFilters}
                className="lg:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
              >
                <Filter size={13} /> Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-teal-500 rounded-full" />
                )}
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

          {hasActiveFilters && (
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
              {brand && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full border border-teal-200">
                  Brand: {brand}
                  <button type="button" onClick={() => updateParam('brand', '')} className="hover:text-rose-500 transition-colors"><X size={11} /></button>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full border border-teal-200">
                  Price: {minPrice || '0'} – {maxPrice || '∞'}
                  <button type="button" onClick={() => applyMultipleParams({ minPrice: '', maxPrice: '' })} className="hover:text-rose-500 transition-colors"><X size={11} /></button>
                </span>
              )}
              {availability && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full border border-teal-200">
                  {availability === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                  <button type="button" onClick={() => updateParam('availability', '')} className="hover:text-rose-500 transition-colors"><X size={11} /></button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className={view === 'grid' ? 'grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5' : 'space-y-3'}>
              {Array(9).fill(null).map((_, i) => (
                view === 'grid'
                  ? <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100"><div className="h-48 bg-slate-100 animate-pulse" /><div className="p-4 space-y-2"><div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" /><div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" /></div></div>
                  : <div key={i} className="bg-white rounded-xl h-28 border border-slate-100 animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className={view === 'grid' ? 'grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5' : 'space-y-3'}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onAddToCart={(prod) => addToCart(prod, false)} view={view} />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400">
              <Package size={56} className="mx-auto mb-4 text-slate-200" />
              <p className="font-bold text-slate-600 text-lg">No products found</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">
                {search
                  ? `Nothing matched "${search}". Try different keywords or clear filters.`
                  : 'Try adjusting your search or filters'}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <X size={14} /> Clear all filters
                  </button>
                )}
                {search && (
                  <Link
                    to="/customer/categories"
                    className="text-sm font-bold text-teal-700 hover:text-teal-800 px-4 py-2 rounded-xl border border-teal-200 bg-teal-50 transition-colors"
                  >
                    Browse categories
                  </Link>
                )}
                {category && !search && (
                  <button
                    type="button"
                    onClick={() => updateParam('category', '')}
                    className="text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    Clear category filter
                  </button>
                )}
              </div>
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

      {showFilters && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setShowFilters(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col lg:hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-teal-600" />
                Filters
              </h3>
              <button type="button" onClick={() => setShowFilters(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <ProductFiltersPanel
                {...filterPanelProps}
                sort={mobileDraft.sort}
                category={mobileDraft.category}
                brand={mobileDraft.brand}
                minPrice={mobileDraft.minPrice}
                maxPrice={mobileDraft.maxPrice}
                availability={mobileDraft.availability}
                onSortChange={(v) => setMobileDraft((d) => ({ ...d, sort: v }))}
                onCategoryChange={(v) => setMobileDraft((d) => ({ ...d, category: v }))}
                onBrandChange={(v) => setMobileDraft((d) => ({ ...d, brand: v }))}
                onMinPriceChange={(v) => setMobileDraft((d) => ({ ...d, minPrice: v }))}
                onMaxPriceChange={(v) => setMobileDraft((d) => ({ ...d, maxPrice: v }))}
                onAvailabilityChange={(v) => setMobileDraft((d) => ({ ...d, availability: v }))}
                onClearAll={() => {
                  setMobileDraft({ sort: 'newest', category: '', brand: '', minPrice: '', maxPrice: '', availability: '' });
                }}
                hasActiveFilters={Boolean(
                  mobileDraft.category || mobileDraft.brand || mobileDraft.minPrice ||
                  mobileDraft.maxPrice || mobileDraft.availability
                )}
              />
            </div>
            <div className="border-t border-slate-100 p-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex-1 text-sm font-bold py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyMobileFilters}
                className="flex-1 text-sm font-bold py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}

      <CustomerFooter />
    </div>
  );
};

export default CustomerProducts;
