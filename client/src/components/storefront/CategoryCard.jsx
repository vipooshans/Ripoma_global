import React from 'react';

const CATEGORY_ICONS = ['📦', '🔧', '⚙️', '🧴', '🖥️', '📱', '🎨', '🏗️', '🌿', '💡', '🚛', '🔬'];

const CategoryCard = ({ category, onClick }) => {
  const icon = category.icon || CATEGORY_ICONS[Math.abs(category.name.charCodeAt(0)) % CATEGORY_ICONS.length];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-teal-200 transition-all duration-300 text-center w-full"
    >
      <div className="w-14 h-14 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
        {icon}
      </div>
      <div>
        <p className="font-bold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{category.name}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
          {category.productCount} product{category.productCount !== 1 ? 's' : ''}
        </p>
      </div>
    </button>
  );
};

export default CategoryCard;
