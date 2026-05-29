import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatches, useUpdateDispatchStatus } from '../../hooks/useDispatches';
import DispatchKanbanCard from '../../components/exports/DispatchKanbanCard';

const COLUMNS = [
  { key: 'pending', title: 'Pending Pickup', desc: 'Awaiting carrier pick up', bg: 'bg-slate-50 border-slate-200' },
  { key: 'handed_to_carrier', title: 'Handed to Carrier', desc: 'Shipment accepted by courier', bg: 'bg-amber-50/30 border-amber-200' },
  { key: 'in_transit', title: 'In Transit', desc: 'Freight en-route to destination', bg: 'bg-purple-50/20 border-purple-200' },
  { key: 'out_for_delivery', title: 'Out For Delivery', desc: 'Local delivery vehicle dispatched', bg: 'bg-blue-50/20 border-blue-200' },
  { key: 'delivered', title: 'Delivered', desc: 'Delivery confirmation received', bg: 'bg-emerald-50/20 border-emerald-250' }
];

const DispatchBoard = () => {
  const navigate = useNavigate();
  const [draggingId, setDraggingId] = useState(null);

  // Queries & Mutations
  const { data: dispatchesData, isLoading, error, refetch } = useDispatches({
    status: 'pending,handed_to_carrier,in_transit,out_for_delivery,delivered',
    limit: 100
  });

  const updateStatusMutation = useUpdateDispatchStatus();

  const handleDragStart = (e, dispatchId) => {
    setDraggingId(dispatchId);
    e.dataTransfer.setData('text/plain', dispatchId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const dispatchId = e.dataTransfer.getData('text/plain') || draggingId;
    if (!dispatchId) return;

    const dispatches = dispatchesData?.dispatches || [];
    const dispatch = dispatches.find(d => d._id === dispatchId);
    if (!dispatch) return;

    if (dispatch.status === targetStatus) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: dispatchId,
        status: targetStatus
      });
      alert(`Shipment ${dispatch.dispatchNumber} updated to ${targetStatus.replace(/_/g, ' ')}.`);
      refetch();
    } catch (err) {
      alert(`Error updating shipment status: ${err.message}`);
    } finally {
      setDraggingId(null);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        Error loading shipments: {error.message}
      </div>
    );
  }

  const dispatches = dispatchesData?.dispatches || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Carrier Dispatch board</h1>
        <p className="text-slate-500 text-sm">
          Drag shipment cards across columns to advance carrier delivery stages (Pending → Picked Up → In Transit → Out for Delivery → Delivered).
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-slate-100/50 rounded-xl p-4 h-[300px] animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start min-h-[500px]">
          {COLUMNS.map((col) => {
            const colDispatches = dispatches.filter(d => d.status === col.key);

            return (
              <div
                key={col.key}
                className={`border rounded-xl p-4 flex flex-col space-y-3 min-h-[450px] transition-all bg-white shadow-sm ${col.bg}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <div className="pb-2 border-b border-slate-250/70">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{col.title}</h3>
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                      {colDispatches.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{col.desc}</p>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[550px] pr-0.5">
                  {colDispatches.length === 0 ? (
                    <div className="text-center py-12 text-[10px] text-slate-450 font-semibold border border-dashed border-slate-200 rounded-xl bg-white/40">
                      Drag shipments here
                    </div>
                  ) : (
                    colDispatches.map((disp) => (
                      <DispatchKanbanCard
                        key={disp._id}
                        dispatch={disp}
                        onClick={() => navigate(`/exports/orders/${disp.exportOrder?._id || disp.exportOrder}`)}
                        onDragStart={handleDragStart}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DispatchBoard;
