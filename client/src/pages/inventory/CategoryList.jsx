import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useCategories,
  useDeleteCategory
} from '../../hooks/useInventory';
import { buildCategoryTree } from '../../utils/categoryUtils';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Package
} from 'lucide-react';

const CategoryRow = ({ category, depth, onDelete, isDeleting }) => {
  const parentName = category.parent?.name;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
          {depth > 0 && <ChevronRight size={12} className="text-slate-300 shrink-0" />}
          <span className="text-lg leading-none">{category.icon || '📦'}</span>
          <div>
            <p className="font-bold text-slate-800 text-sm">{category.name}</p>
            {category.description && (
              <p className="text-[10px] text-slate-400 line-clamp-1 max-w-xs">{category.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3.5 px-3 text-xs text-slate-500 font-medium">
        {parentName || <span className="text-slate-300">—</span>}
      </td>
      <td className="py-3.5 px-3 text-center">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
          <Package size={10} />
          {category.productCount ?? 0}
        </span>
      </td>
      <td className="py-3.5 px-3 text-xs text-slate-400 font-mono">{category.sortOrder ?? 0}</td>
      <td className="py-3.5 px-3">
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/inventory/categories/${category._id}/edit`}
            className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Edit category"
          >
            <Pencil size={14} />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(category)}
            disabled={isDeleting}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
            title="Delete category"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

const CategoryList = () => {
  const { data: categories, isLoading } = useCategories();
  const deleteMutation = useDeleteCategory();

  const rows = useMemo(() => {
    if (!categories?.length) return [];
    const byParent = buildCategoryTree(categories);
    const result = [];

    const walk = (nodes, depth = 0) => {
      nodes.forEach((cat) => {
        result.push({ category: cat, depth });
        const children = byParent.get(String(cat._id)) || [];
        if (children.length) walk(children, depth + 1);
      });
    };

    walk(byParent.get('root') || []);
    return result;
  }, [categories]);

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"? This cannot be undone.`)) return;

    try {
      await deleteMutation.mutateAsync(category._id);
      toast.success('Category deleted successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers size={22} className="text-teal-600" />
            Product Categories
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Organize catalog items into categories and subcategories for the customer storefront.
          </p>
        </div>
        <Link
          to="/inventory/categories/add"
          className="btn-primary flex items-center gap-2 text-sm self-start"
        >
          <Plus size={16} />
          Add Category
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading categories...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <Layers size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="font-semibold text-slate-600">No categories yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first category to organize products.</p>
            <Link to="/inventory/categories/add" className="btn-primary inline-flex mt-4 text-sm">
              <Plus size={14} /> Add Category
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Parent</th>
                  <th className="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Products</th>
                  <th className="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Order</th>
                  <th className="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ category, depth }) => (
                  <CategoryRow
                    key={category._id}
                    category={category}
                    depth={depth}
                    onDelete={handleDelete}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryList;
