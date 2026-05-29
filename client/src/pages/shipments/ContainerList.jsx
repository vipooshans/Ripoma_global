import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, RefreshCw, Layers, MapPin, Anchor, Scale, AlertTriangle 
} from 'lucide-react';
import { useContainers } from '../../hooks/useContainers';
import ContainerPayloadBar from '../../components/shipments/ContainerPayloadBar';
import { useAuth } from '../../hooks/useAuth';

const statusStyles = {
  available: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/50',
  booked: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50',
  in_transit: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50',
  at_port: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50',
  unloading: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50',
  returned: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700',
  damaged: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
};

const ContainerList = () => {
  const { user } = useAuth() || { user: { role: 'admin' } };
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    page: 1,
    limit: 10,
    sort: 'containerNumber:asc'
  });

  const { data, isLoading } = useContainers(filters);
  const containers = data?.containers || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const isStaff = user && ['admin', 'manager', 'staff'].includes(user.role);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Container Asset Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Standard ISO container inventory tracking, tare weights, and payload utilization analytics.
          </p>
        </div>
        {isStaff && (
          <Link
            to="/shipments/containers/create"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Register Container
          </Link>
        )}
      </div>

      {/* Filter Options */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Code/Owner/Location/Seal..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
            />
          </div>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
          >
            <option value="">Status: All</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
            <option value="in_transit">In Transit</option>
            <option value="at_port">At Port</option>
            <option value="unloading">Unloading</option>
            <option value="returned">Returned</option>
            <option value="damaged">Damaged</option>
          </select>

          {/* Type */}
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
          >
            <option value="">Type: All</option>
            <option value="20GP">20' Dry General Purpose (20GP)</option>
            <option value="40GP">40' Dry General Purpose (40GP)</option>
            <option value="40HC">40' High Cube Dry (40HC)</option>
            <option value="20RF">20' Reefer Refrigerated (20RF)</option>
            <option value="40RF">40' Reefer Refrigerated (40RF)</option>
            <option value="20OT">20' Open Top (20OT)</option>
            <option value="40OT">40' Open Top (40OT)</option>
            <option value="20FR">20' Flat Rack (20FR)</option>
            <option value="40FR">40' Flat Rack (40FR)</option>
            <option value="LCL">Less than Container Load (LCL)</option>
          </select>

          {/* Sort */}
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
          >
            <option value="containerNumber:asc">Sort: Container ID (A-Z)</option>
            <option value="containerNumber:desc">Sort: Container ID (Z-A)</option>
            <option value="maxPayload:desc">Sort: Max Capacity (High-Low)</option>
            <option value="createdAt:desc">Sort: Date Added (Newest)</option>
          </select>
        </div>
      </div>

      {/* Grid of Containers */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : containers.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-slate-400">
          No container assets registered.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {containers.map(c => {
            const hasShipment = c.currentShipment;
            const statusClass = statusStyles[c.status] || 'bg-slate-50 text-slate-700';

            return (
              <div key={c._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Link 
                      to={`/shipments/containers/${c._id}`} 
                      className="text-base font-extrabold text-slate-900 dark:text-slate-100 hover:text-teal-600 hover:underline tracking-tight"
                    >
                      {c.containerNumber}
                    </Link>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusClass}`}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
                    <span>Type: {c.type}</span>
                    {c.owner && <span>Owner: {c.owner}</span>}
                  </div>
                </div>

                {/* Utilization */}
                <ContainerPayloadBar currentPayload={c.currentPayload} maxPayload={c.maxPayload} tare={c.tare} />

                {/* Tracking Details */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span>Location: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{c.currentLocation || 'N/A'}</strong></span>
                  </div>
                  {c.sealNumber && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Scale className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span>Seal Number: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{c.sealNumber}</strong></span>
                    </div>
                  )}
                  {hasShipment && (
                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Anchor className="h-3.5 w-3.5 text-teal-600 flex-shrink-0 animate-pulse" />
                      <span>
                        Shipment: 
                        <Link to={`/shipments/${hasShipment._id}`} className="text-teal-600 hover:underline font-bold ml-1">
                          {hasShipment.shipmentNumber}
                        </Link>
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <Link 
                    to={`/shipments/containers/${c._id}`} 
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-355 rounded-lg font-bold text-xs transition-colors"
                  >
                    View Details
                  </Link>
                  {isStaff && (
                    <Link 
                      to={`/shipments/containers/${c._id}/edit`} 
                      className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100/50 dark:bg-teal-950/20 dark:hover:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-lg font-bold text-xs transition-colors border border-teal-100 dark:border-teal-900/40"
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pages > 1 && (
        <div className="bg-slate-50 dark:bg-slate-900/40 px-6 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-center text-xs font-semibold text-slate-500">
          <span>Showing {(filters.page - 1) * filters.limit + 1} to {Math.min(filters.page * filters.limit, total)} of {total} containers</span>
          <div className="flex gap-2">
            <button 
              onClick={() => handlePageChange(filters.page - 1)} 
              disabled={filters.page === 1}
              className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded disabled:opacity-40"
            >
              Previous
            </button>
            <button 
              onClick={() => handlePageChange(filters.page + 1)} 
              disabled={filters.page === pages}
              className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContainerList;
