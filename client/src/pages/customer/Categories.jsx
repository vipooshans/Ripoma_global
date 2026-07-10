import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import storefrontService from '../../services/storefront.service';
import CategoryCard from '../../components/storefront/CategoryCard';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import { Home, ChevronRight, Layers, Package, Loader2 } from 'lucide-react';

const CustomerCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await storefrontService.getCategories();
        setCategories(data.categories || []);
      } catch {
        toast.error('Failed to load categories.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCategoryClick = (cat) => {
    if (cat.subcategories?.length > 0) {
      navigate(`/customer/categories/${cat.id}`);
    } else {
      navigate(`/customer/products?category=${cat.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-slate-400 w-full">
        <Link to="/customer" className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <Home size={11} /> Home
        </Link>
        <ChevronRight size={11} />
        <span className="text-teal-600 font-bold">Categories</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12 flex-1 w-full">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-teal-600 mb-2">
            <Layers size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Browse</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Product Categories</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            Explore our catalog by category — from electronics and machinery to agriculture and textiles.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
            <Loader2 size={20} className="animate-spin text-teal-500" />
            <span className="text-sm font-medium">Loading categories...</span>
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} onClick={() => handleCategoryClick(cat)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-slate-400">
            <Package size={48} className="mx-auto mb-3 text-slate-200" />
            <p className="font-semibold text-slate-600">No categories available yet</p>
            <Link to="/customer/products" className="text-teal-600 text-sm font-bold mt-3 inline-block hover:underline">
              Browse all products
            </Link>
          </div>
        )}
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerCategories;
