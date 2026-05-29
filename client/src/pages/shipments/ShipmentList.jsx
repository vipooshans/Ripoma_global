import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Download, RefreshCw, Ship, Plane, Truck, 
  MapPin, Calendar, HelpCircle, ArrowDown, ArrowUp, FileSpreadsheet 
} from 'lucide-react';
import { useShipments } from '../../hooks/useShipments';
import ShipmentStatusBadge from '../../components/shipments/ShipmentStatusBadge';
import DirectionBadge from '../../components/shipments/DirectionBadge';
import DelayPill from '../../components/shipments/DelayPill';
import api from '../../services/api';

const methodIcons = {
  sea: <Ship className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
  air: <Plane className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
  road: <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  rail: <Truck className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
  courier: <HelpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
};

const ShipmentList = () => {
  const [filters, setFilters] = useState({
    search: '',
    direction: '',
    status: '',
    shippingMethod: '',
    isDelayed: '',
    page: 1,
    limit: 10,
    sort: 'createdAt:desc'
  });

  const { data, isLoading, refetch } = useShipments(filters);
  const shipments = data?.shipments || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // reset to page 1 on filter change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleExportCSV = async () => {
    try {
      // Trigger browser download by requesting CSV file
      const response = await api.get('/shipments/csv', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `shipments_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export shipments CSV', error);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Logistics Shipments Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unified directory of active and historic inbound & outbound shipments.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-900"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export CSV
          </button>
          <Link
            to="/shipments/create"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Book Shipment
          </Link>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Code/Tracking/Carrier..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
            />
          </div>

          {/* Direction */}
          <select
            value={filters.direction}
            onChange={(e) => handleFilterChange('direction', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
          >
            <option value="">Direction: All</option>
            <option value="inbound">Inbound (Imports)</option>
            <option value="outbound">Outbound (Exports)</option>
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
          >
            <option value="">Status: All</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_transit">In Transit</option>
            <option value="at_port">At Port</option>
            <option value="customs">Customs</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="exception">Exception/Alert</option>
          </select>

          {/* Shipping Method */}
          <select
            value={filters.shippingMethod}
            onChange={(e) => handleFilterChange('shippingMethod', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
          >
            <option value="">Method: All</option>
            <option value="sea">Sea Freight</option>
            <option value="air">Air Cargo</option>
            <option value="road">Road Freight</option>
            <option value="rail">Rail Cargo</option>
            <option value="courier">Courier Express</option>
          </select>

          {/* Delay state */}
          <select
            value={filters.isDelayed}
            onChange={(e) => handleFilterChange('isDelayed', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
          >
            <option value="">Compliance: All</option>
            <option value="false">On Schedule</option>
            <option value="true">Delayed Cargo</option>
          </select>
        </div>
      </div>

      {/* Shipments Table List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            No shipments matched the current search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                  <th className="py-3 px-4">Shipment #</th>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">Carrier & Tracking</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Route Path</th>
                  <th className="py-3 px-4">Departure</th>
                  <th className="py-3 px-4">Est. Arrival</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Comms Alert</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {shipments.map(s => {
                  const methodIcon = methodIcons[s.shippingMethod?.toLowerCase()] || <Truck className="h-4 w-4" />;
                  
                  return (
                    <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-slate-700 dark:text-slate-300">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <Link to={`/shipments/${s._id}`} className="hover:text-teal-600 hover:underline">
                          {s.shipmentNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <DirectionBadge direction={s.direction} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold">{s.carrierName}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{s.trackingNumber}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 capitalize font-medium">
                          {methodIcon}
                          {s.shippingMethod}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <div className="flex items-center gap-1 font-semibold truncate" title={s.origin?.name}>
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {s.origin?.name}
                        </div>
                        <div className="flex items-center gap-1 font-semibold truncate text-[10px] text-teal-600 dark:text-teal-400 mt-0.5" title={s.destination?.name}>
                          <MapPin className="h-3 w-3" />
                          {s.destination?.name}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {s.departureDate ? new Date(s.departureDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {s.estimatedArrivalDate ? new Date(s.estimatedArrivalDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <ShipmentStatusBadge status={s.status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <DelayPill isDelayed={s.isDelayed} delayDays={s.delayDays} reason={s.delayReason} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link 
                            to={`/shipments/${s._id}`} 
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold transition-colors"
                          >
                            View
                          </Link>
                          <Link 
                            to={`/shipments/${s._id}/edit`} 
                            className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 hover:bg-teal-100 rounded font-semibold transition-colors border border-teal-100 dark:border-teal-900/40"
                          >
                            Manage
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pages > 1 && (
          <div className="bg-slate-50 dark:bg-slate-800/10 px-4 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>
              Showing {(filters.page - 1) * filters.limit + 1} to {Math.min(filters.page * filters.limit, total)} of {total} shipments
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1}
                className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    filters.page === p 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === pages}
                className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipmentList;
