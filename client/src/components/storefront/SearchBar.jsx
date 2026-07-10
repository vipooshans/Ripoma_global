import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ArrowRight, Loader2 } from 'lucide-react';
import storefrontService from '../../services/storefront.service';
import { formatPrice } from '../../utils/formatPrice';

const SearchBar = ({
  className = '',
  compact = false,
  initialQuery = '',
  onSearch
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
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

  const navigateToSearch = (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (onSearch) {
      onSearch(trimmed);
    } else {
      navigate(`/customer/products?search=${encodeURIComponent(trimmed)}`);
    }
    setShowSuggestions(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigateToSearch(query);
  };

  const handleSuggestionClick = (s) => {
    navigate(`/customer/products/${s.id}`);
    setShowSuggestions(false);
    setQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="flex" role="search">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            id="storefront-search"
            type="search"
            value={query}
            onChange={handleChange}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search products, SKUs, categories…"
            aria-label="Search products"
            aria-autocomplete="list"
            aria-expanded={showSuggestions && suggestions.length > 0}
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

      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-30"
          role="listbox"
        >
          {suggestions.map((s) => (
            <li key={s.id} role="option">
              <button
                type="button"
                onMouseDown={() => handleSuggestionClick(s)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors text-left border-b border-slate-50 last:border-0"
              >
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-slate-400">
                  {s.image ? (
                    <img src={s.image} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.sku} · {formatPrice(s.sellingPrice, s.currency)}</p>
                </div>
                <ArrowRight size={13} className="text-slate-300 shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
