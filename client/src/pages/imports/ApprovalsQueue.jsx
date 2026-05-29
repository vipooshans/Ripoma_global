import React from 'react';
import { Link } from 'react-router-dom';
import { usePendingApprovals } from '../../hooks/useImportOrders';
import {
  CheckSquare,
  ArrowRight,
  ShieldCheck,
  User,
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';
import PriorityBadge from '../../components/imports/PriorityBadge';

const ApprovalsQueue = () => {
  const { data: pendingData, isLoading, refetch } = usePendingApprovals();

  const orders = pendingData?.orders || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Approvals Queue</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Review and clear pending import purchase orders requiring your role authorization level.
        </p>
      </div>

      {/* Queue contents */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <CheckSquare size={40} className="mx-auto text-slate-350" />
            <p className="text-xs font-semibold">Your approvals queue is empty.</p>
            <p className="text-[11px] text-slate-450">No purchase orders are currently awaiting your authorization gate.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 font-semibold text-xs text-slate-700">
            {orders.map((o) => {
              const currentLevel = o.approvals?.length || 0;
              const pendingLevel = currentLevel + 1;

              return (
                <div key={o._id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/40 transition-all">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{o.poNumber}</span>
                      <PriorityBadge priority={o.priority} />
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                        Awaiting Level {pendingLevel}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-650 font-bold leading-tight">
                      Supplier: {o.supplier?.companyName}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-450 font-normal">
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-slate-400" />
                        <span>Created by: {o.createdBy?.name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        <span>Submitted: {new Date(o.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span>Items: {o.items?.length || 0} lines</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-base font-extrabold text-slate-950">
                        ${o.grandTotal?.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">{o.currency}</span>
                    </div>

                    <Link
                      to={`/imports/orders/${o._id}/approve`}
                      className="bg-teal-650 hover:bg-teal-750 text-white font-bold py-2 px-3.5 rounded-lg text-xs shadow-sm flex items-center gap-1 shadow-teal-500/10 transition-all shrink-0"
                    >
                      <span>Review</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalsQueue;
