import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useProductDetail,
  useCreateProduct,
  useUpdateProduct,
  useCategories,
  useSuppliers
} from '../../hooks/useInventory';
import { flattenCategoryOptions } from '../../utils/categoryUtils';
import { ArrowLeft, Save, Eye, Sparkles } from 'lucide-react';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Queries
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { data: productDetail, isLoading: isProductLoading } = useProductDetail(id);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  // Form Fields State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unit: 'pcs',
    unitCost: 0,
    sellingPrice: 0,
    currency: 'USD',
    images: [''],
    barcode: '',
    hsCode: '',
    countryOfOrigin: '',
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    tags: '',
    status: 'active',
    isFeatured: false,
    supplier: '',
    lowStockThreshold: 10,
    reorderQuantity: 50
  });

  // Populate data when editing
  useEffect(() => {
    if (isEdit && productDetail?.product) {
      const p = productDetail.product;
      setFormData({
        sku: p.sku || '',
        name: p.name || '',
        description: p.description || '',
        category: p.category?._id || p.category || '',
        unit: p.unit || 'pcs',
        unitCost: p.unitCost || 0,
        sellingPrice: p.sellingPrice || 0,
        currency: p.currency || 'USD',
        images: p.images && p.images.length > 0 ? p.images : [''],
        barcode: p.barcode || '',
        hsCode: p.hsCode || '',
        countryOfOrigin: p.countryOfOrigin || '',
        weight: p.weight || 0,
        dimensions: p.dimensions || { length: 0, width: 0, height: 0 },
        tags: p.tags ? p.tags.join(', ') : '',
        status: p.status || 'active',
        isFeatured: Boolean(p.isFeatured),
        supplier: p.supplier?._id || p.supplier || '',
        lowStockThreshold: p.lowStockThreshold || 10,
        reorderQuantity: p.reorderQuantity || 50
      });
    }
  }, [isEdit, productDetail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDimensionChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [name]: parseFloat(value) || 0
      }
    }));
  };

  const handleImageChange = (index, value) => {
    const updatedImages = [...formData.images];
    updatedImages[index] = value;
    setFormData((prev) => ({ ...prev, images: updatedImages }));
  };

  const addImageField = () => {
    setFormData((prev) => ({ ...prev, images: [...prev.images, ''] }));
  };

  const removeImageField = (index) => {
    const updatedImages = formData.images.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      images: updatedImages.length > 0 ? updatedImages : ['']
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Product Name is required.');
      return;
    }

    if (!formData.category) {
      toast.error('Category is required.');
      return;
    }

    // Clean payload
    const processedTags = formData.tags
      ? formData.tags.split(',').map((t) => t.trim()).filter((t) => t !== '')
      : [];

    const cleanedImages = formData.images.map((img) => img.trim()).filter((img) => img !== '');

    const payload = {
      ...formData,
      tags: processedTags,
      images: cleanedImages,
      unitCost: parseFloat(formData.unitCost) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      weight: parseFloat(formData.weight) || 0,
      lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
      reorderQuantity: parseInt(formData.reorderQuantity) || 50
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, ...payload });
        toast.success('Product updated successfully.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Product catalogued successfully.');
      }
      navigate('/inventory/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product.');
    }
  };

  const categoryOptions = flattenCategoryOptions(categories || []);

  if (isEdit && isProductLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading catalog profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/inventory/products"
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isEdit ? 'Modify Catalog Item' : 'New Product Cataloging'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isEdit
              ? `Editing detail settings for product: ${formData.sku}`
              : 'Add dimensions, pricing structures, and custom settings for a new international cargo item.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: General Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs border-b border-slate-100 pb-2">
            General Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SKU */}
            <div>
              <label className="form-label">SKU (Stock Keeping Unit)</label>
              <div className="relative">
                <input
                  type="text"
                  name="sku"
                  className="form-input uppercase"
                  placeholder="Auto-generated if left empty"
                  value={formData.sku}
                  onChange={handleChange}
                  disabled={isEdit}
                />
                {!isEdit && (
                  <Sparkles size={14} className="absolute right-3 top-3 text-teal-500 pointer-events-none" />
                )}
              </div>
            </div>

            {/* Name */}
            <div className="md:col-span-2">
              <label className="form-label required">Product Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="Solar Panels, Copper Cables, etc."
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description</label>
            <textarea
              name="description"
              rows={3}
              className="form-input py-2"
              placeholder="Provide a description of cargo uses, storage conditions, and details."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="form-label required">Category</label>
              <select
                name="category"
                className="form-select"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select Category</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label className="form-label">Default Supplier</label>
              <select
                name="supplier"
                className="form-select"
                value={formData.supplier}
                onChange={handleChange}
              >
                <option value="">No Default Supplier</option>
                {suppliers?.suppliers?.map((sup) => (
                  <option key={sup._id} value={sup._id}>
                    {sup.companyName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="form-label">Status</label>
              <select
                name="status"
                className="form-select"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isFeatured"
              name="isFeatured"
              checked={formData.isFeatured}
              onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="isFeatured" className="text-sm font-semibold text-slate-700 cursor-pointer">
              Feature on customer storefront homepage
            </label>
          </div>
        </div>

        {/* Row 2: Pricing & Stock Config */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs border-b border-slate-100 pb-2">
            Pricing & Stock Rules
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Unit */}
            <div>
              <label className="form-label">Unit of Measure</label>
              <input
                type="text"
                name="unit"
                className="form-input"
                placeholder="pcs, kg, meters, box"
                value={formData.unit}
                onChange={handleChange}
              />
            </div>

            {/* Currency */}
            <div>
              <label className="form-label">Currency</label>
              <select
                name="currency"
                className="form-select"
                value={formData.currency}
                onChange={handleChange}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="LKR">LKR (Rs)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>

            {/* Unit Cost */}
            <div>
              <label className="form-label">Unit Purchasing Cost</label>
              <input
                type="number"
                name="unitCost"
                step="0.01"
                min="0"
                className="form-input"
                value={formData.unitCost}
                onChange={handleChange}
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="form-label">Unit Selling Price</label>
              <input
                type="number"
                name="sellingPrice"
                step="0.01"
                min="0"
                className="form-input"
                value={formData.sellingPrice}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Low stock limit */}
            <div>
              <label className="form-label">Low Stock Threshold Warning</label>
              <input
                type="number"
                name="lowStockThreshold"
                min="0"
                className="form-input"
                value={formData.lowStockThreshold}
                onChange={handleChange}
              />
              <p className="text-[10px] text-slate-400 mt-1">Triggers system alert banners when stock falls below this level.</p>
            </div>

            {/* Reorder Quantity */}
            <div>
              <label className="form-label">Reorder Increment Quantity</label>
              <input
                type="number"
                name="reorderQuantity"
                min="0"
                className="form-input"
                value={formData.reorderQuantity}
                onChange={handleChange}
              />
              <p className="text-[10px] text-slate-400 mt-1">Advised bulk restock size during procurement orders.</p>
            </div>
          </div>
        </div>

        {/* Row 3: Customs & Logistics */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs border-b border-slate-100 pb-2">
            Customs & Cargo Attributes
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Barcode */}
            <div>
              <label className="form-label">UPC / EAN Barcode</label>
              <input
                type="text"
                name="barcode"
                className="form-input"
                value={formData.barcode}
                onChange={handleChange}
              />
            </div>

            {/* HS Code */}
            <div>
              <label className="form-label">Customs HS Code</label>
              <input
                type="text"
                name="hsCode"
                className="form-input"
                placeholder="8541.40.60"
                value={formData.hsCode}
                onChange={handleChange}
              />
            </div>

            {/* Country of Origin */}
            <div>
              <label className="form-label">Country of Origin</label>
              <input
                type="text"
                name="countryOfOrigin"
                className="form-input"
                placeholder="Sri Lanka, China"
                value={formData.countryOfOrigin}
                onChange={handleChange}
              />
            </div>

            {/* Weight */}
            <div>
              <label className="form-label">Unit Weight (kg)</label>
              <input
                type="number"
                name="weight"
                step="0.01"
                min="0"
                className="form-input"
                value={formData.weight}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="form-label">Package Length (cm)</label>
              <input
                type="number"
                name="length"
                min="0"
                className="form-input"
                value={formData.dimensions.length}
                onChange={handleDimensionChange}
              />
            </div>
            <div>
              <label className="form-label">Package Width (cm)</label>
              <input
                type="number"
                name="width"
                min="0"
                className="form-input"
                value={formData.dimensions.width}
                onChange={handleDimensionChange}
              />
            </div>
            <div>
              <label className="form-label">Package Height (cm)</label>
              <input
                type="number"
                name="height"
                min="0"
                className="form-input"
                value={formData.dimensions.height}
                onChange={handleDimensionChange}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="form-label">Tags (comma-separated)</label>
            <input
              type="text"
              name="tags"
              className="form-input"
              placeholder="solar, electrical, panel, import"
              value={formData.tags}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Row 4: Images */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-xs border-b border-slate-100 pb-2">
            Product Images
          </h3>

          <div className="space-y-2">
            {formData.images.map((img, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="https://example.com/image.jpg"
                  value={img}
                  onChange={(e) => handleImageChange(idx, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeImageField(idx)}
                  className="p-2 border border-slate-200 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addImageField}
              className="text-xs font-bold text-teal-650 hover:text-teal-800 flex items-center gap-1 mt-1"
            >
              + Add Image URL Field
            </button>
          </div>

          {/* Previews grid */}
          {formData.images.some((url) => url.trim() !== '') && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Live Image Previews</span>
              <div className="flex flex-wrap gap-2">
                {formData.images
                  .filter((url) => url.trim() !== '')
                  .map((url, idx) => (
                    <div key={idx} className="w-16 h-16 rounded border border-slate-200 overflow-hidden bg-slate-50 relative group">
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          <Link
            to="/inventory/products"
            className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-5 rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn-primary text-xs py-2 px-5 shadow-teal-500/10 flex items-center gap-1.5"
          >
            <Save size={14} />
            <span>{isEdit ? 'Update Catalog Product' : 'Register Catalog Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
