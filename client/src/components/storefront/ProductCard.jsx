import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, ShieldCheck, Heart } from 'lucide-react';
import { formatPrice } from '../../utils/formatPrice';
import { isInWishlist, toggleWishlist } from '../../utils/wishlist';
import StarRating from './StarRating';

const ProductCard = ({ product, onAddToCart, view = 'grid' }) => {
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(() => isInWishlist(product.id));
  const inStock = product.totalStock > 0;

  useEffect(() => {
    const sync = () => setWishlisted(isInWishlist(product.id));
    window.addEventListener('wishlist-updated', sync);
    return () => window.removeEventListener('wishlist-updated', sync);
  }, [product.id]);

  const handleAdd = (e) => {
    e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    const { added: wasAdded } = toggleWishlist(product);
    setWishlisted(wasAdded);
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
              {product.brand && (
                <p className="text-[10px] text-slate-500 font-semibold">{product.brand}</p>
              )}
              <h3 className="font-bold text-slate-800 text-sm mt-0.5 group-hover:text-teal-700 transition-colors">{product.name}</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">{product.sku}</p>
              {product.reviewSummary?.count > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <StarRating rating={product.reviewSummary.average} size={12} />
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {product.reviewSummary.average} ({product.reviewSummary.count})
                  </span>
                </div>
              )}
              {product.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{product.description}</p>}
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-2 mb-1">
                <button
                  type="button"
                  onClick={handleWishlist}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                    wishlisted
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200'
                  }`}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <Heart size={14} className={wishlisted ? 'fill-white' : ''} />
                </button>
              </div>
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
      <div className="relative bg-gradient-to-br from-slate-50 to-teal-50/30 h-40 sm:h-52 flex items-center justify-center overflow-hidden">
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
        {product.isFeatured && !wishlisted && (
          <div className="absolute top-3 right-12 bg-amber-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">Featured</div>
        )}
        <button
          type="button"
          onClick={handleWishlist}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm backdrop-blur-sm ${
            wishlisted
              ? 'bg-rose-500 text-white opacity-100'
              : 'bg-white/80 text-slate-400 hover:text-rose-500 hover:bg-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
          }`}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={14} className={wishlisted ? 'fill-white' : ''} />
        </button>
      </div>
      <div className="p-3 sm:p-4">
        {product.category && (
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{product.category.name}</span>
        )}
        {product.brand && (
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{product.brand}</p>
        )}
        <h3 className="font-bold text-slate-800 text-sm mt-1 leading-tight line-clamp-2 group-hover:text-teal-700 transition-colors">{product.name}</h3>
        {product.reviewSummary?.count > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <StarRating rating={product.reviewSummary.average} size={12} />
            <span className="text-[10px] text-slate-500 font-semibold">
              {product.reviewSummary.average} ({product.reviewSummary.count})
            </span>
          </div>
        )}
        {product.description && (
          <p className="hidden sm:block text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
        )}
        <p className="hidden sm:block text-xs text-slate-400 mt-1 font-mono">SKU: {product.sku}</p>
        <div className="flex items-center justify-between gap-2 mt-2.5 sm:mt-3">
          <div className="min-w-0">
            <p className="text-base sm:text-lg font-extrabold text-slate-900 truncate">{formatPrice(product.sellingPrice, product.currency)}</p>
            <p className="text-[10px] text-slate-400 font-medium">per {product.unit}</p>
          </div>
          <button
            onClick={handleAdd}
            disabled={!inStock}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-2 rounded-xl transition-all duration-200 shrink-0 ${
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
