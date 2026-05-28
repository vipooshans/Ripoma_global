import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWarehouseDetail } from '../../hooks/useInventory';
import {
  ArrowLeft,
  Building,
  MapPin,
  User,
  AlertTriangle,
  Search,
  Package,
  Calendar,
  Grid
} from 'lucide-react';

const WarehouseDetail = () => {
  const { id } = useParams();

  // Queries
  const { data: detail, isLoading, error } = useWarehouseDetail(id);

  // Search filter local state
  const [search, setSearch] = useState('');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading depot profile and stocks...</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="text-center py-12 bg-white border border-slate-200 rounded-xl p-8 max-w-md mx-auto shadow-sm space-y-4">
        <AlertTriangle className="text-rose-500 mx-auto" size={40} />
        <h3 className="font-extrabold text-slate-800 text-sm">Warehouse Not Found</h3>
        <p className="text-slate-500 text-xs">The requested warehouse depot details could not be loaded.</p>
        <Link to="/inventory/warehouses" className="btn-primary text-xs py-2 px-4 block">
          Return to Depots
        </Link>
      </div>
    );
  }

  const { warehouse, stockItems } = detail;

  // Filter stock items by SKU or Name
  const filteredItems = stockItems.filter(
    (item) =>
      item.product?.sku?.toLowerCase().includes(search.toLowerCase()) ||
      item.product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Capacity visual meter colors
  const getCapacityMeterColor = (percentage) => {
    if (percentage >= 95) return { bar: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' };
    if (percentage >= 80) return { bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
    return { bar: 'bg-teal-500', text: 'text-teal-650', bg: 'bg-teal-50/50' };
  };

  const usagePercent = warehouse.capacityPercentage || 0;
  const style = getCapacityMeterColor(usagePercent);

  // Stock status color code
  const getStockIndicatorColor = (stock, threshold) => {
    if (stock <= threshold) return 'text-rose-600 bg-rose-50 border-rose-100'; // red
    if (stock <= threshold + 20) return 'text-amber-600 bg-amber-50 border-amber-100'; // amber
    return 'text-teal-650 bg-teal-50 border-teal-100'; // green
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/inventory/warehouses"
          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase tracking-wider">
            {warehouse.code}
          </span>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1 leading-none">{warehouse.name}</h1>
        </div>
      </div>

      {/* Warehouse Summary Dashboard Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact/Address Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 md:col-span-2">
          <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
            <Building className="text-teal-650" size={14} />
            <span>Depot Location & Management</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
            {/* Address */}
            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <MapPin size={13} /> Physical Location:
              </span>
              <p className="pl-4 text-slate-800 leading-tight">
                {warehouse.address?.street ? `${warehouse.address.street}, ` : ''}
                <br />
                {warehouse.address?.city || ''} {warehouse.address?.postalCode ? `, ${warehouse.address.postalCode}` : ''}
                <br />
                {warehouse.address?.country || ''}
              </p>
            </div>

            {/* Manager */}
            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <User size={13} /> Appointed Manager:
              </span>
              {warehouse.manager ? (
                <div className="pl-4">
                  <strong className="text-slate-800 block">{warehouse.manager.name}</strong>
                  <span className="text-slate-400 block text-[10px] font-medium mt-0.5">{warehouse.manager.email}</span>
                </div>
              ) : (
                <span className="pl-4 text-slate-400 font-medium">No Manager Assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Capacity Slider Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-center space-y-3">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider text-slate-450">
            Storage Capacity Gauge
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-xs">
              <span className={style.text}>{usagePercent}% Filled</span>
              <span className="text-slate-800">{warehouse.capacityUsed} / {warehouse.capacity} units</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${style.bar}`} style={{ width: `${Math.min(100, usagePercent)}%` }} />
            </div>
            {usagePercent >= 95 ? (
              <span className="text-[10px] text-rose-600 font-extrabold block">
                ALERT: Warehouse is reaching max storage threshold limit.
              </span>
            ) : usagePercent >= 80 ? (
              <span className="text-[10px] text-amber-600 font-bold block">
                CAUTION: Warehouse capacity is over 80% usage threshold.
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium block">
                Warehouse is operating within normal capacity limits.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stock Items Directory List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Package className="text-teal-650" size={16} />
              <span>Stock Inventory Directory</span>
            </h3>
            <p className="text-[10px] text-slate-400">List of products registered and stored at this physical warehouse location.</p>
          </div>

          {/* Search box inside warehouse */}
          <div className="relative sm:w-64 w-full">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              className="form-input pl-8 py-1.5 text-xs"
              placeholder="Search by SKU or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold">
            {search ? 'No products match search criteria at this warehouse.' : 'No stock items are stored at this location.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">On Hand</th>
                  <th className="py-2.5 px-3 text-right">Reserved</th>
                  <th className="py-2.5 px-3 text-right">Available</th>
                  <th className="py-2.5 px-3">Shelf Location</th>
                  <th className="py-2.5 px-3">Batch No</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredItems.map((item) => {
                  const stockColor = getStockIndicatorColor(item.quantityOnHand, item.product?.lowStockThreshold);

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-3 font-bold text-slate-800">
                        <Link to={`/inventory/products/${item.product?._id}`} className="hover:text-teal-650">
                          {item.product?.sku}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 font-semibold leading-tight">
                        <Link to={`/inventory/products/${item.product?._id}`} className="hover:text-teal-650 block text-slate-800">
                          {item.product?.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 font-semibold">{item.product?.category?.name || '—'}</td>
                      <td className="py-3.5 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${stockColor}`}>
                          {item.quantityOnHand}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-400 font-semibold">{item.quantityReserved}</td>
                      <td className="py-3.5 px-3 text-right text-teal-650 font-extrabold">{item.quantityAvailable}</td>
                      <td className="py-3.5 px-3 text-slate-500 font-semibold">
                        <span className="flex items-center gap-1">
                          <Grid className="text-slate-350 shrink-0" size={12} />
                          {item.location || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-555 font-mono text-[10px]">{item.batchNumber || '—'}</td>
                      <td className="py-3.5 px-3 text-slate-450 text-[10px]">
                        {item.expiryDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseDetail;
