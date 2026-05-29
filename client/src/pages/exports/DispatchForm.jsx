import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useExportOrderDetail } from '../../hooks/useExportOrders';
import { useCreateDispatch } from '../../hooks/useDispatches';
import DispatchItemsTable from '../../components/exports/DispatchItemsTable';

const DispatchForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  // Queries & Mutations
  const { data: order, isLoading, error } = useExportOrderDetail(orderId);
  const createMutation = useCreateDispatch();

  // Form State
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shippingMethod, setShippingMethod] = useState('sea');
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [weight, setWeight] = useState('');
  const [volume, setVolume] = useState('');
  const [numberOfPackages, setNumberOfPackages] = useState('');
  const [notes, setNotes] = useState('');

  // Address overrides
  const [originAddress, setOriginAddress] = useState({ street: 'Main Warehouse Depot', city: 'Ripoma City', country: 'Global' });
  const [destinationAddress, setDestinationAddress] = useState({ street: '', city: '', state: '', postalCode: '', country: '' });

  // Items to dispatch: [{ product: ObjectId, quantityDispatched: Number }]
  const [itemsToDispatch, setItemsToDispatch] = useState([]);

  useEffect(() => {
    if (order) {
      if (['draft', 'cancelled', 'delivered'].includes(order.status)) {
        alert(`Cannot create dispatch for order in status: ${order.status}`);
        navigate(`/exports/orders/${orderId}`);
        return;
      }
      setShippingMethod(order.shippingMethod || 'sea');
      if (order.shippingAddress) {
        setDestinationAddress(order.shippingAddress);
      }
    }
  }, [order]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (itemsToDispatch.length === 0) {
      return alert('Please select at least one item and enter a quantity to dispatch.');
    }

    const payload = {
      exportOrderId: orderId,
      carrier,
      trackingNumber,
      trackingUrl,
      shippingMethod,
      items: itemsToDispatch,
      dispatchDate,
      estimatedArrival: estimatedArrival || undefined,
      originAddress,
      destinationAddress,
      weight: parseFloat(weight) || undefined,
      volume: parseFloat(volume) || undefined,
      numberOfPackages: parseInt(numberOfPackages) || undefined,
      notes
    };

    createMutation.mutate(payload, {
      onSuccess: (res) => {
        alert(res.message || 'Dispatch shipment recorded successfully.');
        navigate(`/exports/orders/${orderId}`);
      },
      onError: (err) => {
        alert(`Error recording dispatch: ${err.message}`);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        Error loading export order details: {error?.message || 'Order not found.'}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link to={`/exports/orders/${orderId}`} className="hover:text-slate-800 transition">Order {order.orderNumber}</Link>
        <span>/</span>
        <span className="text-slate-800 font-bold">New Dispatch Shipment</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Log Dispatch Shipment</h1>
        <p className="text-slate-500 text-sm">Assemble shipment lines, package dimensions, tracking links, and deduct stock levels.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Shipment line items */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b pb-2">Select Items to Ship</h3>
          <p className="text-xs text-slate-400">
            Specify the quantity of each product to dispatch in this shipment. Live stock availability will display.
          </p>
          <DispatchItemsTable
            orderItems={order.items}
            warehouseId={order.warehouse?._id || order.warehouse}
            dispatchItems={itemsToDispatch}
            onChange={setItemsToDispatch}
          />
        </div>

        {/* Step 2: Carrier & Package specifications */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2 col-span-2">Carrier & Tracking Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Carrier Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. DHL Express, Maersk"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Shipping Method
                </label>
                <select
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="sea">Sea Freight</option>
                  <option value="air">Air Cargo</option>
                  <option value="road">Road Transport</option>
                  <option value="rail">Rail Cargo</option>
                  <option value="courier">Courier Service</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Tracking Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1Z999AA10123"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Tracking URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Dispatch Date
                </label>
                <input
                  type="date"
                  required
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Est. Delivery Arrival
                </label>
                <input
                  type="date"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b pb-2 col-span-2">Package specifications & Metrics</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Volume (m³)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  No. Packages
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={numberOfPackages}
                  onChange={(e) => setNumberOfPackages(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Shipment Notes
              </label>
              <textarea
                placeholder="Log details on packages, dimensions, pallet numbers, or customs refs."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none h-24"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate(`/exports/orders/${orderId}`)}
            className="border border-slate-300 rounded-lg px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isLoading}
            className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-6 py-2 font-semibold transition disabled:opacity-50"
          >
            {createMutation.isLoading ? 'Recording Shipment...' : '🚚 Dispatch Shipment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DispatchForm;
