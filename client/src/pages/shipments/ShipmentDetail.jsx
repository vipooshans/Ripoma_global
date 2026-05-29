import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, RefreshCw, Calendar, MapPin, Anchor, Info, 
  Layers, FileText, Plus, ExternalLink, Download, FileUp 
} from 'lucide-react';
import { useShipmentDetail, useAddTrackingEvent, useUpdateShipment } from '../../hooks/useShipments';
import ShipmentStatusBadge from '../../components/shipments/ShipmentStatusBadge';
import DirectionBadge from '../../components/shipments/DirectionBadge';
import DelayPill from '../../components/shipments/DelayPill';
import TrackingTimeline from '../../components/shipments/TrackingTimeline';
import AddTrackingEventForm from '../../components/shipments/AddTrackingEventForm';
import ShipmentMapStrip from '../../components/shipments/ShipmentMapStrip';
import ContainerPayloadBar from '../../components/shipments/ContainerPayloadBar';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const ShipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth() || { user: { role: 'admin' } }; // fallback for safety
  
  const { data, isLoading, refetch } = useShipmentDetail(id);
  const addEventMutation = useAddTrackingEvent();
  const updateShipmentMutation = useUpdateShipment();

  const [activeTab, setActiveTab] = useState('general');
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('bill_of_lading');
  const [docUrl, setDocUrl] = useState('');

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  const shipment = data?.shipment;
  if (!shipment) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="text-slate-400">Shipment record not found.</div>
        <Link to="/shipments/all" className="text-teal-600 hover:underline">
          Return to directory
        </Link>
      </div>
    );
  }

  const isStaff = user && ['admin', 'manager', 'staff'].includes(user.role);

  const handleAddEvent = async (payload, callback) => {
    try {
      await addEventMutation.mutateAsync({ id, ...payload });
      toast.success('Tracking checkpoint logged successfully.');
      refetch();
      if (callback) callback();
    } catch (err) {
      toast.error('Failed to add tracking event.');
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!docName || !docUrl) return;

    const newDocs = [
      ...(shipment.documents || []),
      { name: docName, type: docType, url: docUrl, uploadedAt: new Date() }
    ];

    try {
      await updateShipmentMutation.mutateAsync({ id, documents: newDocs });
      toast.success('Document attached to shipment.');
      setDocName('');
      setDocUrl('');
      refetch();
    } catch (err) {
      toast.error('Failed to save document attachment.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* Back link & Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <Link to="/shipments/all" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:underline transition-all">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Directory
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              Shipment {shipment.shipmentNumber}
            </h1>
            <DirectionBadge direction={shipment.direction} />
            <DelayPill isDelayed={shipment.isDelayed} delayDays={shipment.delayDays} reason={shipment.delayReason} />
          </div>
        </div>

        {/* Action Controls */}
        {isStaff && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Link
              to={`/shipments/${id}/edit`}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl text-xs font-bold transition-all cursor-pointer bg-white dark:bg-slate-900"
            >
              <Edit className="h-4 w-4 text-teal-600" />
              Modify Details
            </Link>
          </div>
        )}
      </div>

      {/* Main Grid: Stepper (Left) & Map/Tabs (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Timeline & Add Event Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Logistics Activity Timeline
            </h2>
            <TrackingTimeline events={shipment.trackingEvents} />
          </div>

          {isStaff && shipment.status !== 'delivered' && (
            <AddTrackingEventForm 
              onSubmit={handleAddEvent} 
              isLoading={addEventMutation.isPending} 
            />
          )}
        </div>

        {/* Right Column: Route Map & Details Tabs */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Map Strip */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <ShipmentMapStrip 
              origin={shipment.origin} 
              destination={shipment.destination} 
              currentLocation={shipment.currentLocation} 
              isDelayed={shipment.isDelayed}
            />
          </div>

          {/* Details Tabs Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            {/* Tab Bar Header */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 px-4">
              {[
                { id: 'general', label: 'General info', icon: <Info className="h-4 w-4" /> },
                { id: 'orders', label: 'Linked Order', icon: <Anchor className="h-4 w-4" /> },
                { id: 'containers', label: `Containers (${shipment.containers?.length || 0})`, icon: <Layers className="h-4 w-4" /> },
                { id: 'documents', label: `Documents (${shipment.documents?.length || 0})`, icon: <FileText className="h-4 w-4" /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body Contents */}
            <div className="p-6 text-xs text-slate-700 dark:text-slate-300">
              
              {/* Tab 1: General Info */}
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Logistics Status</span>
                      <div className="mt-1">
                        <ShipmentStatusBadge status={shipment.status} />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Carrier Code & Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{shipment.carrierName} ({shipment.carrierCode})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Tracking Number</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 select-all">{shipment.trackingNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Vessel / Voyage / Flight</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {shipment.vesselName || shipment.flightNumber || 'N/A'} {shipment.voyageNumber ? `(Voy: ${shipment.voyageNumber})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Departure Date</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {shipment.departureDate ? new Date(shipment.departureDate).toLocaleDateString() : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Estimated Arrival (ETA)</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {shipment.estimatedArrivalDate ? new Date(shipment.estimatedArrivalDate).toLocaleDateString() : 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Original Estimated ETA</span>
                      <span className="font-semibold text-slate-500 dark:text-slate-400 line-through">
                        {shipment.originalEstimatedArrivalDate ? new Date(shipment.originalEstimatedArrivalDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {shipment.actualArrivalDate && (
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Actual Arrival Date</span>
                        <span className="font-bold text-teal-600 dark:text-teal-400">
                          {new Date(shipment.actualArrivalDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Linked Order details */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {shipment.direction === 'inbound' ? (
                    shipment.importOrder ? (
                      <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Linked Import Purchase Order</span>
                          <Link 
                            to={`/imports/orders/${shipment.importOrder._id}`} 
                            className="inline-flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
                          >
                            Jump to PO
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block">PO Number</span>
                            <span className="font-semibold">{shipment.importOrder.poNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Status</span>
                            <span className="capitalize font-semibold">{shipment.importOrder.status}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400">No linked import purchase order.</div>
                    )
                  ) : (
                    shipment.exportOrder ? (
                      <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Linked Export Sales Order</span>
                          <Link 
                            to={`/exports/orders/${shipment.exportOrder._id}`} 
                            className="inline-flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
                          >
                            Jump to SO
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block">SO Number</span>
                            <span className="font-semibold">{shipment.exportOrder.orderNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Status</span>
                            <span className="capitalize font-semibold">{shipment.exportOrder.status}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400">No linked export sales order.</div>
                    )
                  )}
                </div>
              )}

              {/* Tab 3: Containers */}
              {activeTab === 'containers' && (
                <div className="space-y-4">
                  {(!shipment.containers || shipment.containers.length === 0) ? (
                    <div className="text-center py-10 text-slate-400">No container items linked to this shipment.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {shipment.containers.map(c => (
                        <div key={c._id} className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-900 shadow-sm">
                          <div className="flex justify-between items-center">
                            <Link to={`/shipments/containers/${c._id}`} className="text-sm font-bold text-slate-850 dark:text-slate-100 hover:text-teal-600 hover:underline">
                              {c.containerNumber}
                            </Link>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] uppercase font-bold">{c.type}</span>
                          </div>
                          <ContainerPayloadBar currentPayload={c.currentPayload} maxPayload={c.maxPayload} tare={c.tare} />
                          <div className="flex justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-50 dark:border-slate-800">
                            <span>Seal: {c.sealNumber || 'N/A'}</span>
                            <span>Status: <strong className="capitalize">{c.status}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Documents */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  {/* Documents List */}
                  {(!shipment.documents || shipment.documents.length === 0) ? (
                    <div className="text-center py-10 text-slate-400">No logistics files or bills attached.</div>
                  ) : (
                    <div className="divide-y divide-slate-150 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      {shipment.documents.map((doc, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100">{doc.name}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold capitalize mt-0.5">
                              Type: {doc.type.replace(/_/g, ' ')} | Added: {new Date(doc.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Document Form */}
                  {isStaff && (
                    <form onSubmit={handleAddDocument} className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <FileUp className="h-3.5 w-3.5" />
                        Attach Logistics File Link
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Document Name (e.g. Airway Bill)"
                          value={docName}
                          onChange={(e) => setDocName(e.target.value)}
                          required
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/25"
                        />
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/25"
                        >
                          <option value="bill_of_lading">Bill of Lading</option>
                          <option value="airway_bill">Airway Bill</option>
                          <option value="packing_list">Packing List</option>
                          <option value="commercial_invoice">Commercial Invoice</option>
                          <option value="customs_clearance">Customs Clearance</option>
                          <option value="delivery_receipt">Delivery Receipt</option>
                          <option value="other">Other file</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Document URL link"
                          value={docUrl}
                          onChange={(e) => setDocUrl(e.target.value)}
                          required
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/25"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                        >
                          Attach Document
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentDetail;
