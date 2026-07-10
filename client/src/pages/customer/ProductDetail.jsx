import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import storefrontService from '../../services/storefront.service';
import { useStorefront } from '../../components/storefront/CustomerStorefrontLayout';
import ProductCard from '../../components/storefront/ProductCard';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import { formatPrice } from '../../utils/formatPrice';
import {
  Home, ChevronRight, Package, ShoppingCart, ShieldCheck,
  Loader2, ArrowLeft
} from 'lucide-react';

const CustomerProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useStorefront();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await storefrontService.getProductDetail(id);
        setProduct(data.product);
        setRelated(data.related || []);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Product not found.');
          navigate('/customer/products');
        } else {
          toast.error('Failed to load product.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleAdd = () => {
    if (!product) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 size={20} className="animate-spin text-teal-500" />
        <span className="text-sm font-medium">Loading product...</span>
      </div>
    );
  }

  if (!product) return null;

  const inStock = product.totalStock > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-slate-400 w-full flex-wrap">
        <Link to="/customer" className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <Home size={11} /> Home
        </Link>
        <ChevronRight size={11} />
        <Link to="/customer/products" className="hover:text-teal-600 transition-colors">Products</Link>
        <ChevronRight size={11} />
        <span className="text-teal-600 font-bold line-clamp-1">{product.name}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12 flex-1 w-full">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="aspect-square bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={64} className="text-slate-300" />
              )}
            </div>
          </div>

          <div className="space-y-4">
            {product.brand && (
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{product.brand}</p>
            )}
            {product.category && (
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{product.category.name}</p>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{product.name}</h1>
            <p className="text-xs text-slate-400 font-mono">SKU: {product.sku}</p>

            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                inStock ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </span>
              {inStock && (
                <span className="text-xs text-slate-500">{product.totalStock} available</span>
              )}
            </div>

            <div>
              <p className="text-3xl font-extrabold text-slate-900">{formatPrice(product.sellingPrice, product.currency)}</p>
              <p className="text-xs text-slate-400 mt-0.5">per {product.unit}</p>
            </div>

            {product.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={!inStock}
              className={`inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all text-sm ${
                inStock
                  ? added
                    ? 'bg-emerald-500 text-white'
                    : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-500/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {added ? <><ShieldCheck size={16} /> Added to Cart!</> : <><ShoppingCart size={16} /> Add to Cart</>}
            </button>
          </div>
        </div>

        {related.length > 0 && (
          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} onAddToCart={(prod) => addToCart(prod, false)} />
              ))}
            </div>
          </section>
        )}
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerProductDetail;
