import React from 'react';
import CategoryFilter from './CategoryFilter';
import { X } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popularity', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' }
];

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' }
];

const ProductFiltersPanel = ({
  sort,
  category,
  brand,
  minPrice,
  maxPrice,
  availability,
  categories = [],
  brands = [],
  priceRange = { min: 0, max: 0 },
  onSortChange,
  onCategoryChange,
  onBrandChange,
  onMinPriceChange,
  onMaxPriceChange,
  onAvailabilityChange,
  onClearAll,
  hasActiveFilters
}) => (
  <div className="space-y-6">
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Sort By</p>
      <div className="space-y-1">
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onSortChange(s.value)}
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
      <CategoryFilter
        tree={categories}
        selectedId={category}
        onSelect={onCategoryChange}
      />
    )}

    {brands.length > 0 && (
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Brand</p>
        <select
          value={brand}
          onChange={(e) => onBrandChange(e.target.value)}
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
    )}

    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Price Range</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          placeholder={String(priceRange.min ?? 0)}
          value={minPrice}
          onChange={(e) => onMinPriceChange(e.target.value)}
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
        />
        <span className="text-slate-400 text-xs">–</span>
        <input
          type="number"
          min={0}
          placeholder={String(priceRange.max ?? 0)}
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(e.target.value)}
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
        />
      </div>
    </div>

    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Availability</p>
      <div className="space-y-1">
        {AVAILABILITY_OPTIONS.map((opt) => (
          <button
            key={opt.value || 'all'}
            type="button"
            onClick={() => onAvailabilityChange(opt.value)}
            className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
              availability === opt.value ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>

    {hasActiveFilters && (
      <button
        type="button"
        onClick={onClearAll}
        className="w-full flex items-center justify-center gap-2 text-xs text-rose-600 hover:text-rose-700 font-bold py-2 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
      >
        <X size={12} /> Clear All Filters
      </button>
    )}
  </div>
);

export default ProductFiltersPanel;
