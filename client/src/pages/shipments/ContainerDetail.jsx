import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Trash2, Calendar, MapPin, Scale, Layers, History, Anchor 
} from 'lucide-react';
import { useContainerDetail, useDeleteContainer } from '../../hooks/useContainers';
import ContainerPayloadBar from '../../components/shipments/ContainerPayloadBar';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const statusStyles = {
  available: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/50',
  booked: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50',
  in_transit: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50',
  at_port: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50',
  unloading: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50',
  returned: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700',
  damaged: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50'
};

const ContainerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth() || { user: { role: 'admin' } };
  
  const { data, isLoading } = useContainerDetail(id);
  const deleteMutation = useDeleteContainer();

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  const container = data?.container;
  if (!container) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-slate-400">Container asset not found.</div>
        <Link to="/shipments/containers" className="text-teal-600 hover:underline">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const isStaff = user && ['admin', 'manager', 'staff'].includes(user.role);
  const statusClass = statusStyles[container.status] || 'bg-slate-50 text-slate-700';

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete container ${container.containerNumber}?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.success(`Container ${container.containerNumber} deleted.`);
      navigate('/shipments/containers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete container asset.');
    }
  };

  const formatWeight = (w) => {
    if (w >= 1000) {
      return `${(w / 1000).toFixed(2)} t`;
    }
    return `${w} kg`;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-2">
      {/* Back & Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <Link to="/shipments/containers" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 hover:underline transition-all">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Containers Catalog
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              {container.containerNumber}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${statusClass}`}>
              {container.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {isStaff && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Link
              to={`/shipments/containers/${id}/edit`}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-900"
            >
              <Edit className="h-4 w-4 text-teal-600" />
              Edit Asset
            </Link>
            {['admin', 'manager'].includes(user.role) && (
              <button
                onClick={handleDelete}
                disabled={container.status !== 'available' && container.status !== 'returned' && container.status !== 'damaged'}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title={container.status !== 'available' ? 'Cannot delete an active booked container' : 'Delete container'}
              >
                <Trash2 className="h-4 w-4" />
                Delete Asset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Asset Metrics */}
        <div className="lg:col-span-4 space-y-6">
          {/* Utilization Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Scale className="h-4.5 w-4.5 text-teal-600" />
              Weight Capacity Utilization
            </h2>
            <div className="py-2">
              <ContainerPayloadBar currentPayload={container.currentPayload} maxPayload={container.maxPayload} tare={container.tare} />
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Layers className="h-4.5 w-4.5 text-teal-600" />
              Asset Properties
            </h2>
            <div className="space-y-3.5">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">ISO Type</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{container.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Owner / Leaser</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{container.owner || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Seal Number</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{container.sealNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Empty Tare Weight</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatWeight(container.tare)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Max Gross Weight</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatWeight(container.maxPayload + container.tare)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Current Location</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {container.currentLocation || 'N/A'}
                </span>
              </div>
              {container.notes && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium block mb-1">Asset Notes</span>
                  <p className="text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/25 p-2 rounded-lg leading-relaxed">
                    {container.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Historical Travel Logs */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Booking Segment */}
          {container.currentShipment && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Anchor className="h-4.5 w-4.5 text-teal-600 animate-pulse" />
                Active Booking Assignment
              </h3>
              <div className="bg-teal-50/20 dark:bg-teal-950/15 border border-teal-150/40 dark:border-teal-900/50 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Shipment Code</span>
                    <Link to={`/shipments/${container.currentShipment._id}`} className="text-sm font-extrabold text-teal-600 dark:text-teal-400 hover:underline">
                      {container.currentShipment.shipmentNumber}
                    </Link>
                  </div>
                  <div className="text-slate-500 font-medium">
                    Carrier: {container.currentShipment.carrierName} | Status: <strong className="capitalize">{container.currentShipment.status}</strong>
                  </div>
                </div>
                <Link
                  to={`/shipments/${container.currentShipment._id}`}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  Track Transit Route &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Historic Movement Log Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <History className="h-4.5 w-4.5 text-teal-600" />
              Historic Transit Movements
            </h2>

            {(!container.history || container.history.length === 0) ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No historic movements recorded for this container asset.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Shipment</th>
                      <th className="py-2.5 px-3">From</th>
                      <th className="py-2.5 px-3">To</th>
                      <th className="py-2.5 px-3">Date Dispatched</th>
                      <th className="py-2.5 px-3">Date Returned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {container.history.map((hist, idx) => (
                      <tr key={idx} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                          {hist.shipment ? (
                            <Link to={`/shipments/${hist.shipment._id || hist.shipment}`} className="text-teal-650 hover:text-teal-700 dark:text-teal-400 hover:underline">
                              {hist.shipment.shipmentNumber || 'View Shipment'}
                            </Link>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium">{hist.from}</td>
                        <td className="py-3 px-3 font-medium">{hist.to}</td>
                        <td className="py-3 px-3">
                          {hist.startDate ? new Date(hist.startDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-3">
                          {hist.endDate ? (
                            <span className="font-bold text-teal-600 dark:text-teal-400">
                              {new Date(hist.endDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-amber-500 font-bold italic animate-pulse">In Transit</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContainerDetail;
