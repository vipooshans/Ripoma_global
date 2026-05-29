import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader, Save, Layers } from 'lucide-react';
import { useContainerDetail, useCreateContainer, useUpdateContainer } from '../../hooks/useContainers';
import toast from 'react-hot-toast';

const typeOptions = [
  { value: '20GP', label: "20' Dry General Purpose (20GP)" },
  { value: '40GP', label: "40' Dry General Purpose (40GP)" },
  { value: '40HC', label: "40' High Cube Dry (40HC)" },
  { value: '20RF', label: "20' Reefer Refrigerated (20RF)" },
  { value: '40RF', label: "40' Reefer Refrigerated (40RF)" },
  { value: '20OT', label: "20' Open Top (20OT)" },
  { value: '40OT', label: "40' Open Top (40OT)" },
  { value: '20FR', label: "20' Flat Rack (20FR)" },
  { value: '40FR', label: "40' Flat Rack (40FR)" },
  { value: 'LCL', label: 'Less than Container Load (LCL)' },
  { value: 'other', label: 'Other Type' }
];

const statusOptions = [
  { value: 'available', label: 'Available / Empty' },
  { value: 'booked', label: 'Booked / Assigned' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'at_port', label: 'At Port / Discharged' },
  { value: 'unloading', label: 'Unloading' },
  { value: 'returned', label: 'Returned Empty' },
  { value: 'damaged', label: 'Damaged / Under Repair' }
];

const ContainerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data, isLoading: loadingDetail } = useContainerDetail(id);
  const createMutation = useCreateContainer();
  const updateMutation = useUpdateContainer();

  const [formData, setFormData] = useState({
    containerNumber: '',
    type: '40GP',
    status: 'available',
    owner: '',
    currentLocation: '',
    sealNumber: '',
    tare: 2200, // standard weight in kg
    maxPayload: 26000, // standard weight in kg
    currentPayload: 0,
    notes: ''
  });

  useEffect(() => {
    if (isEdit && data?.container) {
      const c = data.container;
      setFormData({
        containerNumber: c.containerNumber || '',
        type: c.type || '40GP',
        status: c.status || 'available',
        owner: c.owner || '',
        currentLocation: c.currentLocation || '',
        sealNumber: c.sealNumber || '',
        tare: c.tare || 2200,
        maxPayload: c.maxPayload || 26000,
        currentPayload: c.currentPayload || 0,
        notes: c.notes || ''
      });
    }
  }, [isEdit, data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tare' || name === 'maxPayload' || name === 'currentPayload'
        ? Number(value)
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Standard ISO 6346 check (4 letters, 7 digits e.g. MSCU1234567) - let's warn if code looks completely wrong
    const code = formData.containerNumber.toUpperCase().trim();
    if (code.length < 5) {
      toast.error('Container ID is too short. Please input a valid identification code.');
      return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, ...formData });
        toast.success(`Container ${code} updated successfully.`);
      } else {
        await createMutation.mutateAsync(formData);
        toast.success(`Container ${code} registered successfully.`);
      }
      navigate('/shipments/containers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save container record.');
    }
  };

  if (isEdit && loadingDetail) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-teal-650" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto p-2">
      {/* Back button */}
      <div>
        <Link 
          to="/shipments/containers" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 hover:underline transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Containers Catalog
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="p-2.5 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 rounded-xl">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEdit ? `Edit Container ${formData.containerNumber}` : 'Register ISO Shipping Container'}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {isEdit ? 'Update coordinates, tare weight capacities, or repair status.' : 'Add new container asset to platform pool.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs font-bold">
          
          {/* Main info row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
                Container Number / ISO Code *
              </label>
              <input
                type="text"
                name="containerNumber"
                value={formData.containerNumber}
                onChange={handleChange}
                placeholder="e.g. MSCU1234567"
                required
                disabled={isEdit}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 uppercase focus:outline-none focus:ring-2 focus:ring-teal-500/25 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
                Container Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              >
                {typeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
                Asset Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Logistics Tracking Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
                Owner / Carrier Name
              </label>
              <input
                type="text"
                name="owner"
                value={formData.owner}
                onChange={handleChange}
                placeholder="e.g. MAERSK, MSC, COSCO"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
                Current Location
              </label>
              <input
                type="text"
                name="currentLocation"
                value={formData.currentLocation}
                onChange={handleChange}
                placeholder="e.g. Terminal 4, Hamburg Port"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
                Seal Number
              </label>
              <input
                type="text"
                name="sealNumber"
                value={formData.sealNumber}
                onChange={handleChange}
                placeholder="e.g. SL-98234-A"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              />
            </div>
          </div>

          {/* Weights Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
                Tare Weight (Empty kg) *
              </label>
              <input
                type="number"
                name="tare"
                value={formData.tare}
                onChange={handleChange}
                required
                min={0}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
                Max Payload Capacity (kg) *
              </label>
              <input
                type="number"
                name="maxPayload"
                value={formData.maxPayload}
                onChange={handleChange}
                required
                min={0}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
                Current Payload Weight (kg)
              </label>
              <input
                type="number"
                name="currentPayload"
                value={formData.currentPayload}
                onChange={handleChange}
                min={0}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 mb-1.5">
              Asset Notes / Damage Log notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="e.g. Scratched left side door, locking rod slightly loose..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/shipments/containers"
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
                  {isEdit ? 'Save Changes' : 'Register Container'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContainerForm;
