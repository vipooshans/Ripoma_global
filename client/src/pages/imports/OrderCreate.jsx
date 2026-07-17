import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useCreateImportOrder, useUpdateImportOrder, useImportOrderDetail, useSubmitImportOrder } from '../../hooks/useImportOrders';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useProducts, useWarehouses } from '../../hooks/useInventory';
import {
  FileText,
  Package,
  Truck,
  Eye,
  CheckCircle,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import LineItemsTable from '../../components/imports/LineItemsTable';
import OrderTotalsSidebar from '../../components/imports/OrderTotalsSidebar';

const OrderCreate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  // Stepper state
  const [currentStep, setCurrentStep] = useState(1);

  // Queries
  const { data: poDetail, isLoading: poLoading } = useImportOrderDetail(id);
  const { data: supplierData } = useSuppliers({ limit: 100 });
  const { data: productData } = useProducts({ limit: 100 });
  const { data: warehouseData } = useWarehouses();

  // Mutations
  const createMutation = useCreateImportOrder();
  const updateMutation = useUpdateImportOrder();
  const submitMutation = useSubmitImportOrder();

  // Form State
  const [formData, setFormData] = useState({
    supplier: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    priority: 'normal',
    currency: 'USD',
    exchangeRate: 1,
    shippingMethod: 'sea',
    incoterms: 'FOB',
    warehouse: '',
    paymentTerms: '',
    notes: '',
    tags: '',
    // Items
    items: [],
    // Shipping/other totals details
    shippingCost: 0,
    otherCharges: 0,
    amountPaid: 0,
    internalNotes: '',
    deliveryAddress: {
      street: '',
      city: '',
      country: '',
      postalCode: ''
    }
  });

  // Autocomplete product state
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  // Setup initial values on edit mode
  useEffect(() => {
    if (isEditMode && poDetail?.order) {
      const order = poDetail.order;
      setFormData({
        supplier: order.supplier?._id || order.supplier || '',
        orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : '',
        expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().split('T')[0] : '',
        priority: order.priority || 'normal',
        currency: order.currency || 'USD',
        exchangeRate: order.exchangeRate || 1,
        shippingMethod: order.shippingMethod || 'sea',
        incoterms: order.incoterms || 'FOB',
        warehouse: order.warehouse?._id || order.warehouse || '',
        paymentTerms: order.paymentTerms || '',
        notes: order.notes || '',
        tags: order.tags?.join(', ') || '',
        items: order.items?.map(i => ({
          product: i.product?._id || i.product || '',
          sku: i.product?.sku || '',
          name: i.product?.name || '',
          description: i.description || '',
          quantityOrdered: i.quantityOrdered,
          unitCost: i.unitCost,
          discount: i.discount || 0,
          tax: i.tax || 0,
          lineTotal: i.lineTotal
        })) || [],
        shippingCost: order.shippingCost || 0,
        otherCharges: order.otherCharges || 0,
        amountPaid: order.amountPaid || 0,
        internalNotes: order.internalNotes || '',
        deliveryAddress: {
          street: order.deliveryAddress?.street || '',
          city: order.deliveryAddress?.city || '',
          country: order.deliveryAddress?.country || '',
          postalCode: order.deliveryAddress?.postalCode || ''
        }
      });
    }
  }, [isEditMode, poDetail]);

  // Handle warehouse change to automatically pre-populate shipping address
  const handleWarehouseChange = (e) => {
    const whId = e.target.value;
    const selectedWh = warehouseData?.find(w => w._id === whId);

    setFormData(prev => ({
      ...prev,
      warehouse: whId,
      deliveryAddress: selectedWh?.address
        ? {
            street: selectedWh.address.street || '',
            city: selectedWh.address.city || '',
            country: selectedWh.address.country || '',
            postalCode: selectedWh.address.postalCode || ''
          }
        : prev.deliveryAddress
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      deliveryAddress: {
        ...prev.deliveryAddress,
        [name]: value
      }
    }));
  };

  // Step 2 functions: Order items
  const handleAddProduct = () => {
    if (!selectedProduct) return;
    const prod = productData?.products?.find(p => p._id === selectedProduct);
    if (!prod) return;

    // Check if product already added
    if (formData.items.some(i => i.product === prod._id)) {
      toast.error('Product already added to items.');
      return;
    }

    const newItem = {
      product: prod._id,
      sku: prod.sku,
      name: prod.name,
      description: prod.description || '',
      quantityOrdered: 1,
      unitCost: prod.unitCost || 0,
      discount: 0,
      tax: 0,
      lineTotal: prod.unitCost || 0
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setSelectedProduct('');
    setProductSearch('');
  };

  const handleRemoveItem = (index) => {
    const updated = [...formData.items];
    updated.splice(index, 1);
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const handleItemFieldChange = (index, field, value) => {
    const updated = [...formData.items];
    const val = parseFloat(value) || 0;
    updated[index] = {
      ...updated[index],
      [field]: field === 'description' ? value : val
    };

    // Calculate line total reactive on-screen
    const qty = parseFloat(updated[index].quantityOrdered) || 0;
    const cost = parseFloat(updated[index].unitCost) || 0;
    const disc = parseFloat(updated[index].discount) || 0;
    const tax = parseFloat(updated[index].tax) || 0;

    const sub = qty * cost * (1 - disc / 100);
    const lineTotal = sub * (1 + tax / 100);
    updated[index].lineTotal = Math.round(lineTotal * 100) / 100;

    setFormData(prev => ({ ...prev, items: updated }));
  };

  // Computations
  const computeTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    formData.items.forEach(item => {
      const qty = parseFloat(item.quantityOrdered) || 0;
      const cost = parseFloat(item.unitCost) || 0;
      const disc = parseFloat(item.discount) || 0;
      const tax = parseFloat(item.tax) || 0;

      const afterDisc = qty * cost * (1 - disc / 100);
      const discountVal = qty * cost * (disc / 100);
      const taxVal = afterDisc * (tax / 100);

      subtotal += afterDisc;
      taxTotal += taxVal;
      discountTotal += discountVal;
    });

    const shipping = parseFloat(formData.shippingCost) || 0;
    const charges = parseFloat(formData.otherCharges) || 0;
    const grandTotal = subtotal + taxTotal + shipping + charges;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100
    };
  };

  const totals = computeTotals();

  // Submission handles
  const handleSave = async (submitForApproval = false) => {
    if (!formData.supplier) {
      toast.error('Supplier is required.');
      return;
    }
    if (!formData.orderDate) {
      toast.error('Order date is required.');
      return;
    }
    if (!formData.expectedDeliveryDate) {
      toast.error('Expected delivery date is required.');
      return;
    }
    if (formData.items.length === 0) {
      toast.error('Add at least one order line item.');
      return;
    }
    if (!formData.warehouse) {
      toast.error('Destination warehouse is required.');
      return;
    }

    const payload = {
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      shippingCost: parseFloat(formData.shippingCost) || 0,
      otherCharges: parseFloat(formData.otherCharges) || 0,
      amountPaid: parseFloat(formData.amountPaid) || 0
    };
    delete payload.status;

    try {
      let orderId = id;
      if (isEditMode) {
        await updateMutation.mutateAsync({ id, ...payload });
      } else {
        const created = await createMutation.mutateAsync(payload);
        orderId = created?.order?._id || created?._id;
      }

      if (submitForApproval) {
        if (!orderId) {
          toast.error('Order saved but could not submit for approval (missing id).');
          navigate('/imports/orders');
          return;
        }
        await submitMutation.mutateAsync(orderId);
        toast.success('PO saved and submitted for approval.');
      } else {
        toast.success(isEditMode ? 'PO changes saved successfully.' : 'Draft PO created successfully.');
      }
      navigate('/imports/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving purchase order.');
    }
  };

  const nextStep = () => {
    // Basic validation
    if (currentStep === 1) {
      if (!formData.supplier || !formData.warehouse || !formData.expectedDeliveryDate) {
        toast.error('Please fill in Supplier, Expected Delivery Date, and Warehouse.');
        return;
      }
    }
    if (currentStep === 2) {
      if (formData.items.length === 0) {
        toast.error('Please add at least one item to order list.');
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  if (isEditMode && poLoading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse text-xs">Loading PO information...</div>;
  }

  const suppliers = supplierData?.suppliers || [];
  const products = productData?.products || [];
  const warehouses = warehouseData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/imports/orders"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-all"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isEditMode ? `Edit Purchase Order (${poDetail?.order?.poNumber})` : 'Create Purchase Order'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isEditMode ? 'Modify details, items catalog, and delivery requirements.' : 'Standard wizard to generate import purchase orders.'}
          </p>
        </div>
      </div>

      {/* Stepper indicator */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex justify-between items-center max-w-3xl mx-auto">
        {[
          { num: 1, label: 'Basics & Supplier', icon: FileText },
          { num: 2, label: 'Line Items', icon: Package },
          { num: 3, label: 'Delivery & Shipping', icon: Truck },
          { num: 4, label: 'Review', icon: CheckCircle }
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                currentStep >= s.num
                  ? 'bg-teal-50 border-teal-650 text-teal-650 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              {currentStep > s.num ? <Check size={12} /> : s.num}
            </div>
            <span className={`text-xs font-bold hidden sm:inline ${currentStep >= s.num ? 'text-slate-800' : 'text-slate-400'}`}>
              {s.label}
            </span>
            {s.num < 4 && <div className="h-[1px] w-8 bg-slate-200 hidden sm:block mx-1" />}
          </div>
        ))}
      </div>

      {/* Step Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form content */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2 space-y-6">
          {/* STEP 1: BASICS & SUPPLIER */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <FileText size={16} className="text-teal-600" />
                <span>Supplier & Core Specifications</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Supplier Partner *</label>
                  <select
                    name="supplier"
                    className="form-select text-xs"
                    value={formData.supplier}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.companyName} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Destination Warehouse *</label>
                  <select
                    name="warehouse"
                    className="form-select text-xs"
                    value={formData.warehouse}
                    onChange={handleWarehouseChange}
                  >
                    <option value="">Select Warehouse...</option>
                    {warehouses.map(w => (
                      <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Order Date</label>
                  <input
                    type="date"
                    name="orderDate"
                    className="form-input text-xs"
                    value={formData.orderDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="form-label">Expected Delivery Date *</label>
                  <input
                    type="date"
                    name="expectedDeliveryDate"
                    className="form-input text-xs"
                    value={formData.expectedDeliveryDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="form-label">Priority</label>
                  <select
                    name="priority"
                    className="form-select text-xs"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Currency</label>
                  <select
                    name="currency"
                    className="form-select text-xs"
                    value={formData.currency}
                    onChange={handleInputChange}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="CNY">CNY (¥)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Exchange Rate to USD</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="exchangeRate"
                    className="form-input text-xs"
                    value={formData.exchangeRate}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="form-label">Shipping Method</label>
                  <select
                    name="shippingMethod"
                    className="form-select text-xs"
                    value={formData.shippingMethod}
                    onChange={handleInputChange}
                  >
                    <option value="sea">Sea Freight</option>
                    <option value="air">Air Freight</option>
                    <option value="road">Road</option>
                    <option value="rail">Rail</option>
                    <option value="courier">Courier Express</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Incoterms</label>
                  <select
                    name="incoterms"
                    className="form-select text-xs"
                    value={formData.incoterms}
                    onChange={handleInputChange}
                  >
                    <option value="EXW">EXW — Ex Works</option>
                    <option value="FCA">FCA — Free Carrier</option>
                    <option value="FOB">FOB — Free On Board</option>
                    <option value="CIF">CIF — Cost Insurance & Freight</option>
                    <option value="DAP">DAP — Delivered At Place</option>
                    <option value="DDP">DDP — Delivered Duty Paid</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Payment Terms</label>
                  <input
                    type="text"
                    name="paymentTerms"
                    placeholder="e.g. 30% advance, 70% against BL"
                    className="form-input text-xs"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    name="tags"
                    placeholder="e.g. electronics, raw_material"
                    className="form-input text-xs"
                    value={formData.tags}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label">Supplier Notes</label>
                  <textarea
                    name="notes"
                    rows="3"
                    placeholder="Add instructions or order remarks visible to the supplier."
                    className="form-input text-xs"
                    value={formData.notes}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LINE ITEMS */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Package size={16} className="text-teal-650" />
                  <span>Order Items Catalog</span>
                </h3>
              </div>

              {/* Product search box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="form-label">Select Product to Add</label>
                  <select
                    className="form-select text-xs"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                  >
                    <option value="">Choose item...</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.sku} — {p.name} (${p.unitCost})</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1 w-full sm:w-auto shrink-0 justify-center font-bold"
                >
                  <Plus size={14} />
                  <span>Add Line Item</span>
                </button>
              </div>

              {/* Table of items */}
              <LineItemsTable
                items={formData.items}
                isEditable={true}
                currency={formData.currency}
                onChangeItemField={handleItemFieldChange}
                onRemoveItem={handleRemoveItem}
              />
            </div>
          )}

          {/* STEP 3: DELIVERY & SHIPPING DETAILS */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-sm font-extrabold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Truck size={16} className="text-teal-650" />
                <span>Delivery Address & Financial Overheads</span>
              </h3>

              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-700">Shipping Delivery Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="form-label">Street Address</label>
                      <input
                        type="text"
                        name="street"
                        className="form-input text-xs"
                        value={formData.deliveryAddress.street}
                        onChange={handleAddressChange}
                      />
                    </div>
                    <div>
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        name="city"
                        className="form-input text-xs"
                        value={formData.deliveryAddress.city}
                        onChange={handleAddressChange}
                      />
                    </div>
                    <div>
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        name="country"
                        className="form-input text-xs"
                        value={formData.deliveryAddress.country}
                        onChange={handleAddressChange}
                      />
                    </div>
                    <div>
                      <label className="form-label">Postal / Zip Code</label>
                      <input
                        type="text"
                        name="postalCode"
                        className="form-input text-xs"
                        value={formData.deliveryAddress.postalCode}
                        onChange={handleAddressChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Estimated Shipping Cost ({formData.currency})</label>
                    <input
                      type="number"
                      name="shippingCost"
                      className="form-input text-xs"
                      value={formData.shippingCost}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label className="form-label">Other Overhead Charges</label>
                    <input
                      type="number"
                      name="otherCharges"
                      className="form-input text-xs"
                      value={formData.otherCharges}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div>
                    <label className="form-label">Initial Amount Paid</label>
                    <input
                      type="number"
                      name="amountPaid"
                      className="form-input text-xs"
                      value={formData.amountPaid}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Internal Logistics Notes (Private)</label>
                  <textarea
                    name="internalNotes"
                    rows="3"
                    placeholder="Logistics routing details, customs agent contacts, special internal handling instructions."
                    className="form-input text-xs"
                    value={formData.internalNotes}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-sm font-extrabold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <CheckCircle size={16} className="text-teal-650" />
                <span>Confirm Purchase Order Review</span>
              </h3>

              {/* Review summary grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold">
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="font-extrabold text-slate-800 border-b border-slate-200 pb-1">Basics</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-slate-650">
                    <div>Supplier Partner:</div>
                    <div className="text-slate-900 font-bold">
                      {suppliers.find(s => s._id === formData.supplier)?.companyName || '—'}
                    </div>
                    <div>Destination Warehouse:</div>
                    <div className="text-slate-900 font-bold">
                      {warehouses.find(w => w._id === formData.warehouse)?.name || '—'}
                    </div>
                    <div>Expected Delivery:</div>
                    <div className="text-slate-900 font-bold">{formData.expectedDeliveryDate || '—'}</div>
                    <div>Shipping Method:</div>
                    <div className="text-slate-900 font-bold uppercase">{formData.shippingMethod}</div>
                    <div>Incoterms:</div>
                    <div className="text-slate-900 font-bold uppercase">{formData.incoterms}</div>
                    <div>Payment Terms:</div>
                    <div className="text-slate-900 font-bold">{formData.paymentTerms || '—'}</div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="font-extrabold text-slate-800 border-b border-slate-200 pb-1">Logistics / Address</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-slate-650">
                    <div>Street:</div>
                    <div className="text-slate-900 font-bold">{formData.deliveryAddress.street || '—'}</div>
                    <div>City/Country:</div>
                    <div className="text-slate-900 font-bold">
                      {formData.deliveryAddress.city || '—'}, {formData.deliveryAddress.country || '—'}
                    </div>
                    <div>Postal Code:</div>
                    <div className="text-slate-900 font-bold">{formData.deliveryAddress.postalCode || '—'}</div>
                    <div>Priority:</div>
                    <div className="text-slate-900 font-bold uppercase text-[10px]">{formData.priority}</div>
                  </div>
                </div>
              </div>

              {/* Items summary */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-50/70 border-b border-slate-200 px-4 py-3 font-bold text-slate-800">
                  Item Line Summary
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-450 font-bold">
                      <th className="py-2.5 px-4">SKU / Item</th>
                      <th className="py-2.5 px-2 text-right">Qty</th>
                      <th className="py-2.5 px-2 text-right">Cost</th>
                      <th className="py-2.5 px-4 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {formData.items.map(i => (
                      <tr key={i.product}>
                        <td className="py-2.5 px-4">{i.sku} — {i.name}</td>
                        <td className="py-2.5 px-2 text-right">{i.quantityOrdered}</td>
                        <td className="py-2.5 px-2 text-right">${i.unitCost?.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-950">${i.lineTotal?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Approval gate notice */}
              <div className="bg-sky-50 border border-sky-200 text-sky-850 rounded-xl p-4 flex items-start gap-3">
                <Info className="text-sky-650 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-extrabold text-xs">Approval Threshold Gate Information</h4>
                  <p className="text-[11px] text-sky-700 mt-1">
                    PO value is <strong className="font-bold">${totals.grandTotal.toLocaleString()}</strong>.
                    {totals.grandTotal < 5000 ? (
                      <span> This falls below the $5,000 threshold and will trigger a <strong className="font-bold">single-level Manager approval</strong> sequence.</span>
                    ) : (
                      <span> This meets or exceeds the $5,000 threshold and will require a <strong className="font-bold">two-level (Manager + Director/Admin) approval</strong> sequence.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Control Buttons */}
          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold disabled:opacity-50 disabled:hover:bg-white shadow-sm flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <div className="flex gap-2">
              {/* Save as Draft on step 4 or anytime */}
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Save size={14} className="text-slate-450" />
                <span>Save Draft</span>
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 font-bold"
                >
                  <span>Continue</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="bg-teal-650 hover:bg-teal-750 text-white font-bold py-2 px-4 rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-all shadow-teal-500/10"
                >
                  <Check size={14} />
                  <span>Submit for Approval</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Totals Summary Sidebar Panel */}
        <OrderTotalsSidebar
          subtotal={totals.subtotal}
          discountTotal={totals.discountTotal}
          taxTotal={totals.taxTotal}
          shippingCost={formData.shippingCost}
          otherCharges={formData.otherCharges}
          grandTotal={totals.grandTotal}
          currency={formData.currency}
          exchangeRate={formData.exchangeRate}
        />
      </div>
    </div>
  );
};

export default OrderCreate;
