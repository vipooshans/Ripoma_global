import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const CategoryFilter = ({ tree = [], selectedId, onSelect }) => {
  const [expanded, setExpanded] = useState(() => new Set(tree.map((c) => String(c.id))));

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (cat, depth = 0) => {
    const id = String(cat.id);
    const hasChildren = cat.subcategories?.length > 0;
    const isExpanded = expanded.has(id);
    const isSelected = String(selectedId) === id;

    return (
      <div key={id}>
        <div className="flex items-center" style={{ paddingLeft: `${depth * 12}px` }}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpand(id)}
              className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <button
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`flex-1 text-left text-xs px-2 py-2 rounded-lg transition-colors flex items-center justify-between ${
              isSelected ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="truncate">{cat.name}</span>
            <span className="text-[10px] text-slate-400 ml-1 shrink-0">{cat.productCount}</span>
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {cat.subcategories.map((sub) => renderNode(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!tree.length) return null;

  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Categories</p>
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => onSelect('')}
          className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
            !selectedId ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Categories
        </button>
        {tree.map((cat) => renderNode(cat))}
      </div>
    </div>
  );
};

export default CategoryFilter;
