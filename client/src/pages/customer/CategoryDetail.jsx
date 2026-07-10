import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import storefrontService from '../../services/storefront.service';
import { useStorefront } from '../../components/storefront/CustomerStorefrontLayout';
import CategoryCard from '../../components/storefront/CategoryCard';
import ProductCard from '../../components/storefront/ProductCard';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import { Home, ChevronRight, Package, Loader2, ArrowRight } from 'lucide-react';

const CustomerCategoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useStorefront();

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [catData, prodData] = await Promise.all([
          storefrontService.getCategoryDetail(id),
          storefrontService.getProducts({ category: id, limit: 12 })
        ]);
        setCategory(catData.category);
        setProducts(prodData.products || []);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Category not found.');
          navigate('/customer/categories');
        } else {
          toast.error('Failed to load category.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleSubcategoryClick = (sub) => {
    if (sub.subcategories?.length > 0) {
      navigate(`/customer/categories/${sub.id}`);
    } else {
      navigate(`/customer/products?category=${sub.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 size={20} className="animate-spin text-teal-500" />
        <span className="text-sm font-medium">Loading category...</span>
      </div>
    );
  }

  if (!category) return null;

  const breadcrumb = category.breadcrumb || [{ id: category.id, name: category.name }];
  const subcategories = category.subcategories || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-slate-400 w-full flex-wrap">
        <Link to="/customer" className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <Home size={11} /> Home
        </Link>
        <ChevronRight size={11} />
        <Link to="/customer/categories" className="hover:text-teal-600 transition-colors">Categories</Link>
        {breadcrumb.map((crumb, idx) => (
          <React.Fragment key={crumb.id}>
            <ChevronRight size={11} />
            {idx === breadcrumb.length - 1 ? (
              <span className="text-teal-600 font-bold">{crumb.name}</span>
            ) : (
              <Link to={`/customer/categories/${crumb.id}`} className="hover:text-teal-600 transition-colors">
                {crumb.name}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12 flex-1 w-full">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{category.icon || '📦'}</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{category.name}</h1>
            </div>
            {category.description && (
              <p className="text-slate-500 text-sm max-w-2xl">{category.description}</p>
            )}
            <p className="text-xs text-slate-400 mt-2 font-medium">
              {category.productCount} product{category.productCount !== 1 ? 's' : ''} in this category
            </p>
          </div>
          <Link
            to={`/customer/products?category=${category.id}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-700 bg-teal-50 px-4 py-2 rounded-xl border border-teal-100 transition-colors self-start"
          >
            View all products <ArrowRight size={14} />
          </Link>
        </div>

        {subcategories.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-extrabold text-slate-800 mb-4">Subcategories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {subcategories.map((sub) => (
                <CategoryCard key={sub.id} category={sub} onClick={() => handleSubcategoryClick(sub)} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-extrabold text-slate-800 mb-4">
            {subcategories.length > 0 ? 'Products in this category' : 'Products'}
          </h2>
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onAddToCart={(prod) => addToCart(prod, false)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-100">
              <Package size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="font-semibold text-sm">No products in this category yet</p>
              <Link to="/customer/products" className="text-teal-600 text-xs font-bold mt-2 inline-block hover:underline">
                Browse all products
              </Link>
            </div>
          )}
        </section>
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerCategoryDetail;
