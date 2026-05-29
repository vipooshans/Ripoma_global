import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useImportOrders, useMarkOrdered, useMarkInTransit } from '../../hooks/useImportOrders';
import {
  FileText,
  Truck,
  ArrowRight,
  TrendingUp,
  Package,
  Calendar,
  AlertTriangle,
  MoveRight
} from 'lucide-react';
import POStatusBadge from '../../components/imports/POStatusBadge';
import PriorityBadge from '../../components/imports/PriorityBadge';
import TrackingKanbanCard from '../../components/imports/TrackingKanbanCard';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'approved', title: 'Approved POs', desc: 'Authorized, ready to send', bg: 'bg-slate-50 border-slate-200' },
  { key: 'ordered', title: 'Ordered with Supplier', desc: 'Placed, waiting production', bg: 'bg-teal-50/50 border-teal-200' },
  { key: 'in_transit', title: 'In Transit', desc: 'Cargo en-route, check customs', bg: 'bg-purple-50/50 border-purple-200' },
  { key: 'partially_received', title: 'Partially Received', desc: 'Initial split intake recorded', bg: 'bg-orange-50/50 border-orange-200' }
];

const TrackingBoard = () => {
  const navigate = useNavigate();

  // Queries
  const { data: orderData, isLoading, refetch } = useImportOrders({
    status: 'approved,ordered,in_transit,partially_received',
    limit: 100
  });

  // Mutations
  const markOrderedMutation = useMarkOrdered();
  const markInTransitMutation = useMarkInTransit();

  // Drag state
  const [draggingId, setDraggingId] = useState(null);

  const handleDragStart = (e, orderId) => {
    setDraggingId(orderId);
    e.dataTransfer.setData('text/plain', orderId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain') || draggingId;
    if (!orderId) return;

    const order = orderData?.orders?.find(o => o._id === orderId);
    if (!order) return;

    // Check transition validity
    if (targetStatus === order.status) return;

    try {
      if (targetStatus === 'ordered' && order.status === 'approved') {
        await markOrderedMutation.mutateAsync(orderId);
        toast.success(`Order ${order.poNumber} marked as Ordered.`);
      } else if (targetStatus === 'in_transit' && ['ordered', 'approved'].includes(order.status)) {
        await markInTransitMutation.mutateAsync({ id: orderId, notes: 'Moved to Transit via Kanban Board.' });
        toast.success(`Order ${order.poNumber} marked as In Transit.`);
      } else if (targetStatus === 'partially_received' || targetStatus === 'received') {
        toast.error('Record Goods Receipt to set receipt intake status.');
      } else {
        toast.error(`Invalid status transition from ${order.status} to ${targetStatus}`);
      }
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating PO status.');
    } finally {
      setDraggingId(null);
    }
  };

  const orders = orderData?.orders || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Active Logistics Board</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Drag cards to advance states (Approved → Ordered → In Transit). Record receipts to complete received intake.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-100/50 rounded-xl p-4 h-[300px] animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start min-h-[500px]">
          {COLUMNS.map((col) => {
            const colOrders = orders.filter(o => o.status === col.key);

            return (
              <div
                key={col.key}
                className={`border rounded-xl p-4 flex flex-col space-y-3 min-h-[450px] transition-all ${col.bg}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <div className="pb-2 border-b border-slate-200/70">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{col.title}</h3>
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                      {colOrders.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-0.5 font-medium">{col.desc}</p>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[550px] pr-0.5">
                  {colOrders.length === 0 ? (
                    <div className="text-center py-12 text-[10px] text-slate-400 font-semibold border border-dashed border-slate-200 rounded-xl bg-white/40">
                      Drag active POs here
                    </div>
                  ) : (
                    colOrders.map((o) => (
                      <TrackingKanbanCard
                        key={o._id}
                        order={o}
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

export default TrackingBoard;
