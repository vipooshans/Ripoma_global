import React from 'react';
import { CalendarDays, Package } from 'lucide-react';

const priorityStyles = {
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  normal: 'bg-slate-50 text-slate-600 border-slate-200',
  low: 'bg-blue-50 text-blue-600 border-blue-200'
};

const ExportOrderKanbanCard = ({ order, onClick }) => {
  const itemCount = order.items?.reduce(
    (total, item) => total + (Number(item.quantityOrdered) || 0),
    0
  ) || 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-sm font-bold text-slate-800">
          {order.orderNumber}
        </span>
        <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase ${priorityStyles[order.priority] || priorityStyles.normal}`}>
          {order.priority || 'normal'}
        </span>
      </div>

      <p className="mt-2 truncate text-xs font-semibold text-slate-700">
        {order.customer?.companyName || 'Customer not assigned'}
      </p>

      <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Package size={13} />
          <span>{itemCount} units</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays size={13} />
          <span>
            {order.requestedDeliveryDate
              ? `Due ${new Date(order.requestedDeliveryDate).toLocaleDateString()}`
              : `Ordered ${new Date(order.orderDate).toLocaleDateString()}`}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
        <span className="font-semibold capitalize text-slate-500">
          {order.status.replace(/_/g, ' ')}
        </span>
        <span className="font-bold text-slate-800">
          {order.currency || 'USD'} {(order.grandTotal || 0).toLocaleString()}
        </span>
      </div>
    </button>
  );
};

export default ExportOrderKanbanCard;
