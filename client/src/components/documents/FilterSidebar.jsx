import React from 'react';
import { X, Filter } from 'lucide-react';
import { CATEGORY_LABELS } from './DocumentCard';

const FilterSidebar = ({ filters, onChange, onClose }) => {
  const categories = Object.entries(CATEGORY_LABELS);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    onChange({ category: '', isExpired: '', isConfidential: '', search: filters.search });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 w-64 flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
          <Filter size={14} className="text-teal-400" /> Filters
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X size={16} />
        </button>
      </div>

      {/* Category */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="radio" name="category" value="" checked={!filters.category}
              onChange={() => handleChange('category', '')}
              className="accent-teal-500" />
            <span className="text-sm text-slate-300 group-hover:text-teal-400 transition-colors">All Categories</span>
          </label>
          {categories.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer group">
              <input type="radio" name="category" value={value}
                checked={filters.category === value}
                onChange={() => handleChange('category', value)}
                className="accent-teal-500" />
              <span className="text-sm text-slate-400 group-hover:text-teal-400 transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Expiry Status */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Expiry Status</label>
        <div className="space-y-1">
          {[['', 'All'], ['false', 'Valid'], ['true', 'Expired']].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer group">
              <input type="radio" name="expiry" value={value}
                checked={filters.isExpired === value}
                onChange={() => handleChange('isExpired', value)}
                className="accent-teal-500" />
              <span className="text-sm text-slate-400 group-hover:text-teal-400 transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Confidentiality */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confidentiality</label>
        <div className="space-y-1">
          {[['', 'All'], ['false', 'Public'], ['true', 'Confidential']].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer group">
              <input type="radio" name="confidential" value={value}
                checked={filters.isConfidential === value}
                onChange={() => handleChange('isConfidential', value)}
                className="accent-teal-500" />
              <span className="text-sm text-slate-400 group-hover:text-teal-400 transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <button onClick={clearAll}
        className="w-full text-center text-xs text-slate-500 hover:text-red-400 transition-colors py-1.5 border border-slate-700 rounded-lg hover:border-red-500/40">
        Clear All Filters
      </button>
    </div>
  );
};

export default FilterSidebar;
