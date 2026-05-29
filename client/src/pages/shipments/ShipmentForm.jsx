import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader, Save, Anchor, MapPin } from 'lucide-react';
import { useShipmentDetail, useCreateShipment, useUpdateShipment } from '../../hooks/useShipments';
import { useAvailableContainers } from '../../hooks/useContainers';
import { useImportOrders } from '../../hooks/useImportOrders';
import { useExportOrders } from '../../hooks/useExportOrders';
import toast from 'react-hot-toast';

const carrierOptions = [
  { value: 'MANUAL', label: 'Manual/Internal Tracking' },
  { value: 'DHL', label: 'DHL Express Cargo' },
  { value: 'FEDEX', label: 'FedEx Cargo' },
  { value: 'MAERSK', label: 'Maersk Ocean Lines' }
];

const methodOptions = [
  { value: 'sea', label: 'Sea Freight' },
  { value: 'air', label: 'Air Cargo' },
  { value: 'road', label: 'Road Freight' },
  { value: 'rail', label: 'Rail Cargo' },
  { value: 'courier', label: 'Courier Service' }
];

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled / Booked' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'at_port', label: 'At Port' },
  { value: 'customs', label: 'In Customs' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'exception', label: 'Exception Alert' }
];

const ShipmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: detailData, isLoading: loadingDetail } = useShipmentDetail(id);
  const createMutation = useCreateShipment();
  const updateMutation = useUpdateShipment();

  // Load container and order resources
  const { data: containersList, isLoading: loadingContainers } = useAvailableContainers();
  // Fetch paginated lists with large limit to display in select dropdown
  const { data: importOrdersData } = useImportOrders({ limit: 100 });
  const { data: exportOrdersData } = useExportOrders({ limit: 100 });

  const availableContainers = containersList || [];
  const importOrders = importOrdersData?.importOrders || importOrdersData?.orders || [];
  const exportOrders = exportOrdersData?.exportOrders || exportOrdersData?.orders || [];

  const [formData, setFormData] = useState({
    direction: 'inbound',
    carrierName: 'Manual Tracking',
    carrierCode: 'MANUAL',
    trackingNumber: '',
    shippingMethod: 'sea',
    status: 'scheduled',
    mbl: '',
    hbl: '',
    vesselName: '',
    voyageNumber: '',
    flightNumber: '',
    origin: { name: '', latitude: 0, longitude: 0 },
    destination: { name: '', latitude: 0, longitude: 0 },
    departureDate: '',
    estimatedArrivalDate: '',
    importOrder: '',
    exportOrder: '',
    containers: []
  });

  // Pre-populate if editing
  useEffect(() => {
    if (isEdit && detailData?.shipment) {
      const s = detailData.shipment;
      
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toISOString().substring(0, 10);
      };

      setFormData({
        direction: s.direction || 'inbound',
        carrierName: s.carrierName || 'Manual Tracking',
        carrierCode: s.carrierCode || 'MANUAL',
        trackingNumber: s.trackingNumber || '',
        shippingMethod: s.shippingMethod || 'sea',
        status: s.status || 'scheduled',
        mbl: s.mbl || '',
        hbl: s.hbl || '',
        vesselName: s.vesselName || '',
        voyageNumber: s.voyageNumber || '',
        flightNumber: s.flightNumber || '',
        origin: {
          name: s.origin?.name || '',
          latitude: s.origin?.latitude || 0,
          longitude: s.origin?.longitude || 0
        },
        destination: {
          name: s.destination?.name || '',
          latitude: s.destination?.latitude || 0,
          longitude: s.destination?.longitude || 0
        },
        departureDate: formatDate(s.departureDate),
        estimatedArrivalDate: formatDate(s.estimatedArrivalDate),
        importOrder: s.importOrder?._id || s.importOrder || '',
        exportOrder: s.exportOrder?._id || s.exportOrder || '',
        containers: s.containers ? s.containers.map(c => c._id || c) : []
      });
    }
  }, [isEdit, detailData]);

  // Handle carrier code change to match carrier Name automatically
  useEffect(() => {
    const carrier = carrierOptions.find(c => c.value === formData.carrierCode);
    if (carrier) {
      setFormData(prev => ({
        ...prev,
        carrierName: carrier.label
      }));
    }
  }, [formData.carrierCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: field === 'latitude' || field === 'longitude' ? Number(value) : value
      }
    }));
  };

  const handleContainerToggle = (containerId) => {
    setFormData(prev => {
      const exists = prev.containers.includes(containerId);
      const updated = exists
        ? prev.containers.filter(id => id !== containerId)
        : [...prev.containers, containerId];
      return { ...prev, containers: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!formData.origin.name || !formData.destination.name) {
      toast.error('Origin and Destination names are required.');
      return;
    }

    const payload = { ...formData };
    
    // Clear unused references based on direction
    if (payload.direction === 'inbound') {
      payload.exportOrder = null;
    } else {
      payload.importOrder = null;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, ...payload });
        toast.success('Shipment booking updated successfully.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('New shipment booked successfully.');
      }
      navigate('/shipments/all');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register shipment record.');
    }
  };

  if (isEdit && loadingDetail) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-teal-650" />
      </div>
    );
  }

  // Combine already selected containers when editing so they don't disappear from list
  const containerSelectionPool = [...availableContainers];
  if (isEdit && detailData?.shipment?.containers) {
    detailData.shipment.containers.forEach(c => {
      if (!containerSelectionPool.some(item => item._id === c._id)) {
        containerSelectionPool.push(c);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-2">
      <div>
        <Link 
          to="/shipments/all" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 hover:underline transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Shipments Ledger
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 rounded-xl">
            <Anchor className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEdit ? `Update Shipment ${detailData?.shipment?.shipmentNumber}` : 'Book Logistics Shipment'}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Set transit direction, link orders, assign containers, and configure carrier tracking parameters.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs font-bold">
          
          {/* Section 1: Carrier & Transit Mode */}
          <div className="space-y-4">
            <h3 className="text-slate-800 dark:text-slate-200 font-extrabold border-l-4 border-teal-500 pl-2">
              1. Carrier & Method Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-350 mb-1.5">Cargo Direction *</label>
                <select
                  name="direction"
                  value={formData.direction}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="inbound">Inbound (Import Order)</option>
                  <option value="outbound">Outbound (Export Order)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-350 mb-1.5">Carrier Service *</label>
                <select
                  name="carrierCode"
                  value={formData.carrierCode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  {carrierOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-350 mb-1.5">Tracking Number / Code *</label>
                <input
                  type="text"
                  name="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={handleChange}
                  placeholder="e.g. TRK-98234-XYZ"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-350 mb-1.5">Shipping Method *</label>
                <select
                  name="shippingMethod"
                  value={formData.shippingMethod}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  {methodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Order & Container Linking */}
          <div className="space-y-4">
            <h3 className="text-slate-800 dark:text-slate-200 font-extrabold border-l-4 border-teal-500 pl-2">
              2. Transaction & Asset Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Link Order Dropdown */}
              <div>
                {formData.direction === 'inbound' ? (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-350 mb-1.5">Link Purchase Order (Import)</label>
                    <select
                      name="importOrder"
                      value={formData.importOrder}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="">-- Select Active PO --</option>
                      {importOrders.map(o => (
                        <option key={o._id} value={o._id}>
                          {o.poNumber} - {o.supplier?.companyName || 'Supplier'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-350 mb-1.5">Link Sales Order (Export)</label>
                    <select
                      name="exportOrder"
                      value={formData.exportOrder}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="">-- Select Confirmed SO --</option>
                      {exportOrders.map(o => (
                        <option key={o._id} value={o._id}>
                          {o.orderNumber} - {o.customer?.companyName || 'Customer'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Containers Multi-checkbox list */}
              <div>
                <label className="block text-slate-700 dark:text-slate-355 mb-1.5">Assign Containers</label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 p-3 h-28 overflow-y-auto space-y-2">
                  {containerSelectionPool.length === 0 ? (
                    <div className="text-slate-400 italic text-[11px] text-center pt-6">No empty available containers in pool.</div>
                  ) : (
                    containerSelectionPool.map(c => (
                      <label key={c._id} className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-800 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.containers.includes(c._id)}
                          onChange={() => handleContainerToggle(c._id)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500/25 h-3.5 w-3.5"
                        />
                        <span>{c.containerNumber} ({c.type} | Owner: {c.owner || 'N/A'} | Status: {c.status})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Routes & Coordinate Pinpoints */}
          <div className="space-y-4">
            <h3 className="text-slate-800 dark:text-slate-200 font-extrabold border-l-4 border-teal-500 pl-2 flex items-center gap-1">
              <MapPin className="h-4.5 w-4.5" />
              3. Route & Coordinates Pinpoints
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/10 p-4 border border-slate-200/50 dark:border-slate-800 rounded-2xl">
              {/* Origin */}
              <div className="space-y-3">
                <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Origin Details</h4>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Port/Location Name *</label>
                  <input
                    type="text"
                    value={formData.origin.name}
                    onChange={(e) => handleNestedChange('origin', 'name', e.target.value)}
                    placeholder="e.g. Shanghai Port, CN"
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.origin.latitude}
                      onChange={(e) => handleNestedChange('origin', 'latitude', e.target.value)}
                      placeholder="31.2304"
                      required
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.origin.longitude}
                      onChange={(e) => handleNestedChange('origin', 'longitude', e.target.value)}
                      placeholder="121.4737"
                      required
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-3">
                <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Destination Details</h4>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Port/Location Name *</label>
                  <input
                    type="text"
                    value={formData.destination.name}
                    onChange={(e) => handleNestedChange('destination', 'name', e.target.value)}
                    placeholder="e.g. Rotterdam Port, NL"
                    required
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.destination.latitude}
                      onChange={(e) => handleNestedChange('destination', 'latitude', e.target.value)}
                      placeholder="51.9244"
                      required
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.destination.longitude}
                      onChange={(e) => handleNestedChange('destination', 'longitude', e.target.value)}
                      placeholder="4.4777"
                      required
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Operational Dates & Shipping Status */}
          <div className="space-y-4">
            <h3 className="text-slate-800 dark:text-slate-200 font-extrabold border-l-4 border-teal-500 pl-2">
              4. Travel Schedules & Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-350 mb-1.5">Logistics Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-350 mb-1.5">Departure Date</label>
                <input
                  type="date"
                  name="departureDate"
                  value={formData.departureDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-850 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-350 mb-1.5">Estimated Arrival (ETA)</label>
                <input
                  type="date"
                  name="estimatedArrivalDate"
                  value={formData.estimatedArrivalDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-850 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-slate-700 dark:text-slate-350 mb-1.5">Vessel Name</label>
                <input
                  type="text"
                  name="vesselName"
                  value={formData.vesselName}
                  onChange={handleChange}
                  placeholder="e.g. Ever Given"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-850 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-355 mb-1.5">Voyage Number</label>
                <input
                  type="text"
                  name="voyageNumber"
                  value={formData.voyageNumber}
                  onChange={handleChange}
                  placeholder="e.g. V-034E"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-850 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-355 mb-1.5">Flight Number (If Air)</label>
                <input
                  type="text"
                  name="flightNumber"
                  value={formData.flightNumber}
                  onChange={handleChange}
                  placeholder="e.g. LH723"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-850 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-355 mb-1.5">Master Bill of Lading (MBL)</label>
                <input
                  type="text"
                  name="mbl"
                  value={formData.mbl}
                  onChange={handleChange}
                  placeholder="e.g. MBL-872364"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-850 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-355 mb-1.5">House Bill of Lading (HBL)</label>
                <input
                  type="text"
                  name="hbl"
                  value={formData.hbl}
                  onChange={handleChange}
                  placeholder="e.g. HBL-982364"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-850 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/shipments/all"
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEdit ? 'Save Changes' : 'Book Shipment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShipmentForm;
