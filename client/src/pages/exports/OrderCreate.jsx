import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateExportOrder, useUpdateExportOrder, useExportOrderDetail } from '../../hooks/useExportOrders';
import { useCustomers } from '../../hooks/useCustomers';
import { useWarehouses } from '../../hooks/useInventory';
import LineItemsTable from '../../components/exports/LineItemsTable';
import OrderTotalsSidebar from '../../components/exports/OrderTotalsSidebar';
import CreditLimitWarning from '../../components/exports/CreditLimitWarning';

const steps = ['Basics', 'Items & Stock', 'Addresses & Charges', 'Credit Check & Save'];

const OrderCreate = () => {
  const { id } = useParams(); // For edit mode
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { data: existingOrder, isLoading: isLoadingOrder } = useExportOrderDetail(id);
  const { data: customers = [] } = useCustomers();
  const { data: warehousesData = [] } = useWarehouses();
  const warehousesList = warehousesData || [];

  const createMutation = useCreateExportOrder();
  const updateMutation = useUpdateExportOrder();

  const [step, setStep] = useState(0);

  // Form State
  const [customer, setCustomer] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [priority, setPriority] = useState('normal');
  const [currency, setCurrency] = useState('USD');
  const [incoterms, setIncoterms] = useState('EXW');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [notes, setNotes] = useState('');
  
  // Addresses
  const [billingAddress, setBillingAddress] = useState({ street: '', city: '', state: '', postalCode: '', country: '' });
  const [shippingAddress, setShippingAddress] = useState({ street: '', city: '', state: '', postalCode: '', country: '' });

  // Items & Charges
  const [items, setItems] = useState([]);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);

  // Pre-populate fields on edit mode
  useEffect(() => {
    if (isEditMode && existingOrder) {
      if (existingOrder.status !== 'draft') {
        alert('Only draft orders can be edited.');
        navigate(`/exports/orders/${id}`);
        return;
      }
      setCustomer(existingOrder.customer?._id || existingOrder.customer || '');
      setWarehouse(existingOrder.warehouse?._id || existingOrder.warehouse || '');
      setPriority(existingOrder.priority || 'normal');
      setCurrency(existingOrder.currency || 'USD');
      setIncoterms(existingOrder.incoterms || 'EXW');
      setPaymentTerms(existingOrder.paymentTerms || '');
      setRequestedDeliveryDate(existingOrder.requestedDeliveryDate ? existingOrder.requestedDeliveryDate.split('T')[0] : '');
      setCustomerReference(existingOrder.customerReference || '');
      setNotes(existingOrder.notes || '');
      
      if (existingOrder.billingAddress) setBillingAddress(existingOrder.billingAddress);
      if (existingOrder.shippingAddress) setShippingAddress(existingOrder.shippingAddress);
      
      setItems(existingOrder.items || []);
      setShippingCharge(existingOrder.shippingCharge || 0);
      setOtherCharges(existingOrder.otherCharges || 0);
    }
  }, [isEditMode, existingOrder]);

  // Pre-fill address and customer payment terms when customer is selected
  const handleCustomerChange = (customerId) => {
    setCustomer(customerId);
    const cust = customers.find(c => c._id === customerId);
    if (cust) {
      setPaymentTerms(cust.paymentTerms || '');
      setCurrency(cust.currency || 'USD');
      if (cust.address) {
        setBillingAddress({
          street: cust.address.street || '',
          city: cust.address.city || '',
          state: cust.address.state || '',
          postalCode: cust.address.postalCode || '',
          country: cust.address.country || ''
        });
      }
      if (cust.shippingAddress) {
        setShippingAddress({
          street: cust.shippingAddress.street || '',
          city: cust.shippingAddress.city || '',
          state: cust.shippingAddress.state || '',
          postalCode: cust.shippingAddress.postalCode || '',
          country: cust.shippingAddress.country || ''
        });
      }
    }
  };

  const handleNext = () => {
    if (step === 0 && (!customer || !warehouse)) {
      return alert('Customer and Source Warehouse are required.');
    }
    if (step === 1 && items.length === 0) {
      return alert('At least one item is required.');
    }
    if (step === 1 && items.some(item => !item.product || item.quantityOrdered <= 0 || item.unitPrice <= 0)) {
      return alert('Please fill in product, valid quantity, and unit price for all line items.');
    }
    setStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      customer,
      warehouse,
      priority,
      currency,
      incoterms,
      paymentTerms,
      requestedDeliveryDate: requestedDeliveryDate || undefined,
      customerReference,
      notes,
      billingAddress,
      shippingAddress,
      items,
      shippingCharge,
      otherCharges
    };

    if (isEditMode) {
      updateMutation.mutate(
        { id, ...payload },
        {
          onSuccess: (res) => {
            alert(res.message || 'Sales Order updated.');
            navigate(`/exports/orders/${id}`);
          },
          onError: (err) => {
            alert(`Error: ${err.message}`);
          }
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (res) => {
          alert(res.message || 'Sales Order created.');
          navigate(`/exports/orders/${res.order._id}`);
        },
        onError: (err) => {
          alert(`Error: ${err.message}`);
        }
      });
    }
  };

  const activeCustomerObj = customers.find(c => c._id === customer);

  // Totals calculations
  let orderSubtotal = 0;
  let orderDiscountTotal = 0;
  let orderTaxTotal = 0;
  items.forEach(item => {
    const qty = parseFloat(item.quantityOrdered) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discount) || 0;
    const tax = parseFloat(item.tax) || 0;
    const base = qty * price;
    const discAmt = base * (disc / 100);
    const after = base - discAmt;
    const taxAmt = after * (tax / 100);
    orderSubtotal += after;
    orderDiscountTotal += discAmt;
    orderTaxTotal += taxAmt;
  });
  const orderGrandTotal = orderSubtotal + orderTaxTotal + shippingCharge + otherCharges;

  if (isEditMode && isLoadingOrder) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          {isEditMode ? `Edit Sales Order: ${existingOrder?.orderNumber}` : 'Raise New Export Order'}
        </h1>
        <p className="text-slate-500 text-sm">
          {isEditMode ? 'Modify draft order details and items.' : 'Follow the steps below to setup logistics, addresses, items, and credit limits.'}
        </p>
      </div>

      {/* Stepper Progress bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center text-xs font-semibold text-slate-400">
        {steps.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-1 justify-center last:flex-initial">
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs border ${idx === step ? 'bg-slate-800 text-white border-slate-800' : idx < step ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200'}`}>
              {idx + 1}
            </span>
            <span className={idx === step ? 'text-slate-800 font-bold' : idx < step ? 'text-indigo-600' : ''}>
              {s}
            </span>
            {idx !== steps.length - 1 && <span className="h-px bg-slate-200 flex-1 max-w-[60px] hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Main Form content */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          {/* STEP 0: Basics */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm">Order Logistics & Client</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Customer *
                  </label>
                  <select
                    value={customer}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    required
                  >
                    <option value="">Select a Customer...</option>
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.companyName} (Terms: {c.paymentTerms || 'N/A'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Source Warehouse *
                  </label>
                  <select
                    value={warehouse}
                    onChange={(e) => setWarehouse(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    required
                  >
                    <option value="">Select source warehouse...</option>
                    {warehousesList.map(w => (
                      <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="USD"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Incoterms
                  </label>
                  <select
                    value={incoterms}
                    onChange={(e) => setIncoterms(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="EXW">EXW — Ex Works</option>
                    <option value="FCA">FCA — Free Carrier</option>
                    <option value="FOB">FOB — Free On Board</option>
                    <option value="CIF">CIF — Cost, Insurance & Freight</option>
                    <option value="DAP">DAP — Delivered At Place</option>
                    <option value="DDP">DDP — Delivered Duty Paid</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Requested Delivery Date
                  </label>
                  <input
                    type="date"
                    value={requestedDeliveryDate}
                    onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Customer PO Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-77892"
                    value={customerReference}
                    onChange={(e) => setCustomerReference(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NET 30"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Internal/Special Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Log details on dispatch delays, specific packing rules, customer preferences, etc."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none h-24"
                />
              </div>
            </div>
          )}

          {/* STEP 1: Items List */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 border-b pb-2 mb-4 text-sm">Line Items & Stock Check</h3>
              <LineItemsTable
                items={items}
                warehouseId={warehouse}
                onChange={setItems}
                readOnly={false}
              />
            </div>
          )}

          {/* STEP 2: Addresses & Charges */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="font-bold text-slate-800 border-b pb-2 text-sm">Billing & Shipping Addresses</h3>
              
              {/* Billing Address Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                  <h4 className="font-semibold text-xs uppercase text-slate-500 mb-2">Billing Address</h4>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Street</label>
                    <input
                      type="text"
                      value={billingAddress.street}
                      onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">City</label>
                      <input
                        type="text"
                        value={billingAddress.city}
                        onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">State</label>
                      <input
                        type="text"
                        value={billingAddress.state}
                        onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Postal Code</label>
                      <input
                        type="text"
                        value={billingAddress.postalCode}
                        onChange={(e) => setBillingAddress({ ...billingAddress, postalCode: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Country</label>
                      <input
                        type="text"
                        value={billingAddress.country}
                        onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address Card */}
                <div className="space-y-3 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                  <h4 className="font-semibold text-xs uppercase text-slate-500 mb-2">Shipping Address</h4>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Street</label>
                    <input
                      type="text"
                      value={shippingAddress.street}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">City</label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">State</label>
                      <input
                        type="text"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Postal Code</label>
                      <input
                        type="text"
                        value={shippingAddress.postalCode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Country</label>
                      <input
                        type="text"
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Credit Check & Save */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="font-bold text-slate-800 border-b pb-2 text-sm">Customer Credit Check</h3>
              
              <CreditLimitWarning
                customer={activeCustomerObj}
                proposedTotal={orderGrandTotal}
              />

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 text-xs text-slate-500 space-y-2">
                <h4 className="font-bold text-slate-700">Audit & Compliance Policies:</h4>
                <p>⚠️ Invoices raised exceeding customer credit limits will record warning log entries on the order timeline history.</p>
                <p>⚙️ Product inventory levels will be decremented, and stock movement issues will be logged when dispatches are created.</p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between border-t pt-4 mt-6 text-sm">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="border border-slate-300 rounded-lg px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30"
            >
              Back
            </button>
            {step === steps.length - 1 ? (
              <button
                type="submit"
                disabled={createMutation.isLoading || updateMutation.isLoading}
                className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-6 py-2 font-semibold"
              >
                {isEditMode 
                  ? (updateMutation.isLoading ? 'Saving...' : 'Save Order Details')
                  : (createMutation.isLoading ? 'Creating...' : 'Save & Create Order')
                }
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-6 py-2 font-semibold"
              >
                Next
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Cost Breakdown */}
        <div>
          <OrderTotalsSidebar
            items={items}
            shippingCharge={shippingCharge}
            otherCharges={otherCharges}
            onChangeShipping={setShippingCharge}
            onChangeOther={setOtherCharges}
            readOnly={step !== 2} // Editable during step 2
          />
        </div>
      </form>
    </div>
  );
};

export default OrderCreate;
