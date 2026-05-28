import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import {
  useWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse
} from '../../hooks/useInventory';
import {
  Building,
  MapPin,
  User,
  ArrowRight,
  ShieldCheck,
  Plus,
  X,
  PlusCircle
} from 'lucide-react';
import api from '../../services/api';

const WarehouseList = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Queries & Mutations
  const { data: warehouses, isLoading, refetch } = useWarehouses();
  const createMutation = useCreateWarehouse();

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    code: '',
    street: '',
    city: '',
    country: '',
    postalCode: '',
    capacity: 10000,
    status: 'active'
  });

  const [managers, setManagers] = useState([]);

  // Fetch managers dynamically when modal opens
  const fetchManagers = async () => {
    try {
      const { data } = await api.get('/users?limit=100');
      // Filter users who can manage warehouses (manager or staff roles)
      const validManagers = (data.users || []).filter(u => ['manager', 'admin'].includes(u.role));
      setManagers(validManagers);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    fetchManagers();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewWarehouse({
      name: '',
      code: '',
      street: '',
      city: '',
      country: '',
      postalCode: '',
      capacity: 10000,
      status: 'active',
      manager: ''
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newWarehouse.name || !newWarehouse.code) {
      toast.error('Warehouse Name and Code are required.');
      return;
    }

    const payload = {
      name: newWarehouse.name,
      code: newWarehouse.code,
      capacity: parseInt(newWarehouse.capacity) || 10000,
      status: newWarehouse.status,
      manager: newWarehouse.manager || null,
      address: {
        street: newWarehouse.street,
        city: newWarehouse.city,
        country: newWarehouse.country,
        postalCode: newWarehouse.postalCode
      }
    };

    try {
      await createMutation.mutateAsync(payload);
      toast.success('Warehouse created successfully.');
      handleCloseModal();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create warehouse.');
    }
  };

  // Capacity visual meter colors
  const getCapacityMeterColor = (percentage) => {
    if (percentage >= 95) return { bar: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' };
    if (percentage >= 80) return { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
    return { bar: 'bg-teal-500', text: 'text-teal-650', bg: 'bg-teal-50/50' };
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Depot Directory</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor storage capacities, physical addresses, and designated site managers.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenModal}
            className="btn-primary flex items-center gap-1.5 text-xs py-2.5 px-4 shadow-teal-500/10 shrink-0"
          >
            <PlusCircle size={15} />
            <span>Add Warehouse</span>
          </button>
        )}
      </div>

      {/* Warehouse Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-50 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !warehouses || warehouses.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl p-8 max-w-md mx-auto shadow-sm">
          <Building className="text-slate-350 mx-auto mb-3 animate-bounce" size={40} />
          <h3 className="font-extrabold text-slate-800 text-sm">No warehouses configured</h3>
          <p className="text-slate-450 text-xs mt-1">Please ask an administrator to register physical storage depots.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((w) => {
            const usagePercent = w.capacityPercentage || 0;
            const style = getCapacityMeterColor(usagePercent);

            return (
              <div
                key={w._id}
                className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                {/* Status indicator bar top */}
                <div className={`h-1.5 w-full ${style.bar}`} />

                <div className="p-5 flex-1 space-y-4">
                  {/* Title & Code */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] bg-slate-100 border border-slate-150 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">
                        {w.code}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-800 mt-2 group-hover:text-teal-650 transition-colors">
                        {w.name}
                      </h3>
                    </div>
                    <Building className="text-slate-350 group-hover:text-teal-500 transition-colors shrink-0" size={24} />
                  </div>

                  {/* Info details list */}
                  <div className="text-xs font-semibold text-slate-600 space-y-2">
                    {/* Location Address */}
                    <div className="flex items-start gap-1.5">
                      <MapPin className="text-slate-400 shrink-0 mt-0.5" size={13} />
                      <span className="leading-tight truncate">
                        {w.address?.street ? `${w.address.street}, ` : ''}
                        {w.address?.city || ''} {w.address?.country ? `, ${w.address.country}` : ''}
                      </span>
                    </div>

                    {/* Manager Name */}
                    <div className="flex items-center gap-1.5">
                      <User className="text-slate-400 shrink-0" size={13} />
                      <span className="truncate">
                        {w.manager?.name ? (
                          <span>Manager: <strong className="font-bold text-slate-700">{w.manager.name}</strong></span>
                        ) : (
                          <span className="text-slate-400 font-medium">Unassigned</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Slider Meter */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-450 uppercase">Capacity Usage</span>
                      <span className={style.text}>{usagePercent}% ({w.capacityUsed} / {w.capacity} units)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${style.bar}`} style={{ width: `${Math.min(100, usagePercent)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Card footer details action */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                  <Link
                    to={`/inventory/warehouses/${w._id}`}
                    className="text-[11px] font-bold text-teal-650 hover:text-teal-850 flex items-center gap-0.5 group/link"
                  >
                    <span>View Stock Breakdown</span>
                    <ArrowRight size={13} className="transform group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Create Warehouse Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Building className="text-teal-650" size={16} />
                <span>Register Warehouse Depot</span>
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="col-span-2">
                    <label className="form-label required">Warehouse Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Rotterdam Logistics Depot"
                      value={newWarehouse.name}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                      required
                    />
                  </div>

                  {/* Code */}
                  <div>
                    <label className="form-label required">Depot Code</label>
                    <input
                      type="text"
                      className="form-input uppercase"
                      placeholder="ROT-01"
                      value={newWarehouse.code}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                      required
                    />
                  </div>

                  {/* Capacity */}
                  <div>
                    <label className="form-label required">Max Capacity Units</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newWarehouse.capacity}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Manager */}
                <div>
                  <label className="form-label">Site Manager</label>
                  <select
                    className="form-select"
                    value={newWarehouse.manager || ''}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, manager: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {managers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Address */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Physical Address</span>
                  <div>
                    <label className="form-label">Street Address</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="123 Logistics Blvd"
                      value={newWarehouse.street}
                      onChange={(e) => setNewWarehouse({ ...newWarehouse, street: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Rotterdam"
                        value={newWarehouse.city}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Netherlands"
                        value={newWarehouse.country}
                        onChange={(e) => setNewWarehouse({ ...newWarehouse, country: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary text-xs py-2 px-4 shadow-teal-500/10"
                >
                  {createMutation.isPending ? 'Saving...' : 'Register Depot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseList;
