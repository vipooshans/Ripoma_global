import React from 'react';

const statusColors = {
  pending: 'border-l-4 border-l-slate-400 bg-slate-50',
  handed_to_carrier: 'border-l-4 border-l-amber-400 bg-amber-50/30',
  in_transit: 'border-l-4 border-l-purple-500 bg-purple-50/20',
  out_for_delivery: 'border-l-4 border-l-blue-500 bg-blue-50/20',
  delivered: 'border-l-4 border-l-emerald-500 bg-emerald-50/20',
  failed: 'border-l-4 border-l-red-500 bg-red-50/20',
  returned: 'border-l-4 border-l-orange-500 bg-orange-50/20'
};

const DispatchKanbanCard = ({ dispatch, onClick }) => {
  const {
    dispatchNumber,
    exportOrder = {},
    status,
    carrier,
    trackingNumber,
    dispatchDate,
    estimatedArrival,
    items = []
  } = dispatch;

  const orderNum = exportOrder?.orderNumber || 'SO-XXXX';
  const borderStyle = statusColors[status] || 'border-l-4 border-l-slate-300';

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 transition-all space-y-2.5 bg-white ${borderStyle}`}
    >
      <div className="flex justify-between items-start">
        <span className="font-mono font-bold text-slate-800 text-sm">{dispatchNumber}</span>
        <span className="text-[10px] uppercase font-semibold text-slate-400">
          Order: {orderNum}
        </span>
      </div>

      <div className="text-xs text-slate-600 space-y-1">
        {carrier && (
          <p className="font-semibold text-slate-700">
            Carrier: {carrier} {trackingNumber ? `(${trackingNumber})` : ''}
          </p>
        )}
        <p>Items: {items.reduce((sum, item) => sum + item.quantityDispatched, 0)} units</p>
        {estimatedArrival && (
          <p className="text-slate-500 text-[11px] mt-1.5 flex items-center gap-1">
            📅 Est. Arrival: {new Date(estimatedArrival).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] text-slate-400">
        <span>Date: {dispatchDate ? new Date(dispatchDate).toLocaleDateString() : 'Pending'}</span>
        <span className="capitalize font-semibold text-slate-600 px-2 py-0.5 rounded bg-slate-100">
          {status.replace(/_/g, ' ')}
        </span>
      </div>
    </div>
  );
};

export default DispatchKanbanCard;
