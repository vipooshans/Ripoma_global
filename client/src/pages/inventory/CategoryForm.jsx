import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory
} from '../../hooks/useInventory';
import { getExcludedParentIds } from '../../utils/categoryUtils';
import { ArrowLeft, Save, Layers } from 'lucide-react';

const CategoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const [formData, setFormData] = useState({
    name: '',
    parent: '',
    description: '',
    icon: '',
    sortOrder: 0
  });

  useEffect(() => {
    if (isEdit && categories?.length) {
      const cat = categories.find((c) => String(c._id) === String(id));
      if (cat) {
        setFormData({
          name: cat.name || '',
          parent: cat.parent?._id || cat.parent || '',
          description: cat.description || '',
          icon: cat.icon || '',
          sortOrder: cat.sortOrder ?? 0
        });
      }
    }
  }, [isEdit, id, categories]);

  const parentOptions = useMemo(() => {
    if (!categories?.length) return [];
    const excluded = new Set(getExcludedParentIds(id, categories).map(String));
    return categories.filter((cat) => !excluded.has(String(cat._id)));
  }, [categories, id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'sortOrder' ? parseInt(value, 10) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Category name is required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      parent: formData.parent || null,
      description: formData.description.trim() || undefined,
      icon: formData.icon.trim() || undefined,
      sortOrder: formData.sortOrder
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, ...payload });
        toast.success('Category updated successfully.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Category created successfully.');
      }
      navigate('/inventory/categories');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category.');
    }
  };

  if (isEdit && categoriesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading category...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/inventory/categories"
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers size={20} className="text-teal-600" />
            {isEdit ? 'Edit Category' : 'New Category'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isEdit ? 'Update category details and parent assignment.' : 'Create a top-level or subcategory for your product catalog.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
        <div>
          <label className="form-label required">Category Name</label>
          <input
            type="text"
            name="name"
            className="form-input"
            placeholder="Electronics, Machinery, Food Products..."
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="form-label">Parent Category</label>
          <select
            name="parent"
            className="form-select"
            value={formData.parent}
            onChange={handleChange}
          >
            <option value="">None (top-level category)</option>
            {parentOptions.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.parent?.name ? `${cat.parent.name} → ` : ''}{cat.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">Leave empty for a top-level category shown on the storefront.</p>
        </div>

        <div>
          <label className="form-label">Description</label>
          <textarea
            name="description"
            rows={3}
            className="form-input py-2"
            placeholder="Brief description for customers browsing this category."
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Icon (emoji)</label>
            <input
              type="text"
              name="icon"
              className="form-input text-xl"
              placeholder="📦"
              value={formData.icon}
              onChange={handleChange}
              maxLength={4}
            />
          </div>
          <div>
            <label className="form-label">Sort Order</label>
            <input
              type="number"
              name="sortOrder"
              className="form-input"
              min={0}
              value={formData.sortOrder}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Link to="/inventory/categories" className="btn-secondary text-sm">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Save size={15} />
            {isEdit ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryForm;
