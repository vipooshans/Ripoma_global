import React, { useState, useRef, useCallback, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ArrowRight, Loader2, Clock, FolderTree } from 'lucide-react';
import storefrontService from '../../services/storefront.service';
import { formatPrice } from '../../utils/formatPrice';

const RECENT_KEY = 'ripoma_recent_searches';
const MAX_RECENT = 5;

const readRecentSearches = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string' && s.trim()).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (q) => {
  const trimmed = q.trim();
  if (!trimmed) return;
  const next = [trimmed, ...readRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
};

const highlightMatch = (text, query) => {
  if (!text || !query?.trim()) return text;
  const q = query.trim();
  const idx = String(text).toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-teal-100 text-teal-800 rounded-sm px-0.5 not-italic font-semibold">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
};

const SearchBar = ({
  className = '',
  compact = false,
  initialQuery = '',
  onSearch
}) => {
  const navigate = useNavigate();
  const inputId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const debounceRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setQuery(initialQuery || '');
  }, [initialQuery]);

  const flatItems = [
    ...productSuggestions.map((s) => ({ kind: 'product', item: s })),
    ...categorySuggestions.map((s) => ({ kind: 'category', item: s })),
    ...(query.trim().length < 2 && recentSearches.length
      ? recentSearches.map((s) => ({ kind: 'recent', item: { name: s } }))
      : [])
  ];

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) {
      setProductSuggestions([]);
      setCategorySuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await storefrontService.getSearchSuggestions(q);
      setProductSuggestions(data.suggestions || []);
      setCategorySuggestions(data.categories || []);
    } catch {
      setProductSuggestions([]);
      setCategorySuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setHighlightIndex(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
    setShowSuggestions(true);
  };

  const navigateToSearch = (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    setRecentSearches(readRecentSearches());
    if (onSearch) {
      onSearch(trimmed);
    } else {
      navigate(`/customer/products?search=${encodeURIComponent(trimmed)}`);
    }
    setShowSuggestions(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (highlightIndex >= 0 && flatItems[highlightIndex]) {
      selectItem(flatItems[highlightIndex]);
      return;
    }
    navigateToSearch(query);
  };

  const selectItem = (entry) => {
    if (!entry) return;
    if (entry.kind === 'product') {
      navigate(`/customer/products/${entry.item.id}`);
      setShowSuggestions(false);
      setQuery('');
      return;
    }
    if (entry.kind === 'category') {
      navigate(`/customer/products?category=${encodeURIComponent(entry.item.id)}`);
      setShowSuggestions(false);
      setQuery('');
      return;
    }
    if (entry.kind === 'recent') {
      setQuery(entry.item.name);
      navigateToSearch(entry.item.name);
    }
  };

  const handleFocus = () => {
    setRecentSearches(readRecentSearches());
    setShowSuggestions(true);
    if (query.trim().length >= 2) fetchSuggestions(query);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || flatItems.length === 0) {
      if (e.key === 'Escape') setShowSuggestions(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? flatItems.length - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightIndex(-1);
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectItem(flatItems[highlightIndex]);
    }
  };

  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-suggest-idx="${highlightIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const showDropdown =
    showSuggestions &&
    (loading ||
      productSuggestions.length > 0 ||
      categorySuggestions.length > 0 ||
      (query.trim().length < 2 && recentSearches.length > 0) ||
      (query.trim().length >= 2 && !loading));

  let runningIndex = 0;

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="flex" role="search">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Search products, SKUs, categories…"
            aria-label="Search products"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-activedescendant={highlightIndex >= 0 ? `suggest-${highlightIndex}` : undefined}
            className={`w-full pl-10 pr-4 border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all placeholder:text-slate-400 ${
              compact ? 'py-2 rounded-l-xl' : 'py-2.5 rounded-l-xl'
            }`}
          />
          {loading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500 animate-spin" aria-hidden="true" />
          )}
        </div>
        <button
          type="submit"
          className={`px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-r-xl transition-colors duration-200 flex items-center gap-2 shrink-0 ${
            compact ? 'px-4' : ''
          }`}
        >
          Search
        </button>
      </form>

      {showDropdown && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30 max-h-80 overflow-y-auto"
          role="listbox"
        >
          {query.trim().length < 2 && recentSearches.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent</p>
              <ul>
                {recentSearches.map((term) => {
                  const idx = runningIndex++;
                  const active = idx === highlightIndex;
                  return (
                    <li key={`recent-${term}`} role="option" aria-selected={active} id={`suggest-${idx}`}>
                      <button
                        type="button"
                        data-suggest-idx={idx}
                        onMouseDown={() => selectItem({ kind: 'recent', item: { name: term } })}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left border-b border-slate-50 ${
                          active ? 'bg-teal-50' : 'hover:bg-teal-50'
                        }`}
                      >
                        <Clock size={14} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{term}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {productSuggestions.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Products</p>
              <ul>
                {productSuggestions.map((s) => {
                  const idx = runningIndex++;
                  const active = idx === highlightIndex;
                  return (
                    <li key={`product-${s.id}`} role="option" aria-selected={active} id={`suggest-${idx}`}>
                      <button
                        type="button"
                        data-suggest-idx={idx}
                        onMouseDown={() => selectItem({ kind: 'product', item: s })}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-slate-50 ${
                          active ? 'bg-teal-50' : 'hover:bg-teal-50'
                        }`}
                      >
                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-slate-400">
                          {s.image ? (
                            <img src={s.image} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Package size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{highlightMatch(s.name, query)}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {s.sku}
                            {s.brand ? ` · ${s.brand}` : ''}
                            {' · '}
                            {formatPrice(s.sellingPrice, s.currency)}
                          </p>
                        </div>
                        <ArrowRight size={13} className="text-slate-300 shrink-0" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {categorySuggestions.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Categories</p>
              <ul>
                {categorySuggestions.map((c) => {
                  const idx = runningIndex++;
                  const active = idx === highlightIndex;
                  return (
                    <li key={`category-${c.id}`} role="option" aria-selected={active} id={`suggest-${idx}`}>
                      <button
                        type="button"
                        data-suggest-idx={idx}
                        onMouseDown={() => selectItem({ kind: 'category', item: c })}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left border-b border-slate-50 last:border-0 ${
                          active ? 'bg-teal-50' : 'hover:bg-teal-50'
                        }`}
                      >
                        <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center shrink-0 text-teal-600">
                          <FolderTree size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{highlightMatch(c.name, query)}</p>
                          <p className="text-xs text-slate-400">{c.productCount} product{c.productCount !== 1 ? 's' : ''}</p>
                        </div>
                        <ArrowRight size={13} className="text-slate-300 shrink-0" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {!loading &&
            query.trim().length >= 2 &&
            productSuggestions.length === 0 &&
            categorySuggestions.length === 0 && (
              <p className="px-4 py-4 text-sm text-slate-400 text-center">No matches for &ldquo;{query.trim()}&rdquo;</p>
            )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
