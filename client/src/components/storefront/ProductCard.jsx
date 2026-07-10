import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, ShieldCheck } from 'lucide-react';
import { formatPrice } from '../../utils/formatPrice';

const ProductCard = ({ product, onAddToCart, view = 'grid' }) => {
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
          ) : (
            <Package size={28} className="text-slate-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              {product.category && (
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{product.category.name}</span>
              )}
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
      className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => navigate(`/customer/products/${product.id}`)}
    >
      <div className="relative bg-gradient-to-br from-slate-50 to-teal-50/30 h-52 flex items-center justify-center overflow-hidden">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
            <Package size={44} />
            <span className="text-xs font-medium text-slate-400">No image</span>
          </div>
        )}
        {!inStock ? (
          <div className="absolute top-3 left-3 bg-slate-800/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">Out of Stock</div>
        ) : (
          <div className="absolute top-3 left-3 bg-teal-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">In Stock</div>
        )}
        {product.isFeatured && (
          <div className="absolute top-3 right-3 bg-amber-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">Featured</div>
        )}
      </div>
      <div className="p-4">
        {product.category && (
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{product.category.name}</span>
        )}
        <h3 className="font-bold text-slate-800 text-sm mt-1 leading-tight line-clamp-2 group-hover:text-teal-700 transition-colors">{product.name}</h3>
        <p className="text-xs text-slate-400 mt-1 font-mono">SKU: {product.sku}</p>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-lg font-extrabold text-slate-900">{formatPrice(product.sellingPrice, product.currency)}</p>
            <p className="text-[10px] text-slate-400 font-medium">per {product.unit}</p>
          </div>
          <button
            onClick={handleAdd}
            disabled={!inStock}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all duration-200 ${
              inStock
                ? added ? 'bg-emerald-500 text-white scale-95' : 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-105 shadow-sm shadow-teal-500/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {added ? <><ShieldCheck size={13} /> Added!</> : <><ShoppingCart size={13} /> Add</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
