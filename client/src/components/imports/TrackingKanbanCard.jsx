import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import PriorityBadge from './PriorityBadge';

const TrackingKanbanCard = ({ order, onDragStart }) => {
  const getDeliveryUrgency = (dateString) => {
    if (!dateString) return { text: 'No ETA', classes: 'text-slate-450 bg-slate-50 border-slate-200' };
    
    const deliveryDate = new Date(dateString);
    const now = new Date();
    // Normalize dates to midnight to compare days accurately
    deliveryDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    
    const diffTime = deliveryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        text: `Overdue by ${Math.abs(diffDays)}d`, 
        classes: 'text-rose-700 bg-rose-50 border-rose-200 font-bold animate-pulse' 
      };
    } else if (diffDays < 3) {
      return { 
        text: diffDays === 0 ? 'Delivery today' : `${diffDays}d remaining`, 
        classes: 'text-rose-650 bg-rose-50 border-rose-200 font-bold animate-pulse' 
      };
    } else if (diffDays <= 7) {
      return { 
        text: `${diffDays}d remaining`, 
        classes: 'text-amber-650 bg-amber-50 border-amber-200' 
      };
    } else {
      return { 
        text: `${diffDays}d remaining`, 
        classes: 'text-teal-650 bg-teal-50 border-teal-200' 
      };
    }
  };

  const urgency = getDeliveryUrgency(order.expectedDeliveryDate);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, order._id)}
      className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all cursor-grab active:cursor-grabbing space-y-2 text-xs font-semibold text-slate-700"
    >
      <div className="flex justify-between items-start">
        <span className="font-bold text-slate-900">{order.poNumber}</span>
        <PriorityBadge priority={order.priority} />
      </div>

      <div className="text-[11px] text-slate-650 truncate font-bold leading-tight">
        {order.supplier?.companyName}
      </div>

      <div className="flex justify-between items-baseline pt-1 border-t border-slate-100 text-[10px] text-slate-450 font-normal">
        <span>Value:</span>
        <span className="text-slate-800 font-extrabold">
          ${order.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {order.expectedDeliveryDate && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
          <div className="flex items-center gap-1 text-[10px] text-slate-450 font-normal">
            <Calendar size={11} className="text-slate-400" />
            <span>ETA: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[9px] border font-bold ${urgency.classes}`}>
            {urgency.text}
          </span>
        </div>
      )}

      <div className="flex justify-end pt-1.5 border-t border-slate-50">
        <Link
          to={`/imports/orders/${order._id}`}
          className="text-[10px] font-bold text-teal-650 hover:text-teal-850 flex items-center gap-0.5 group"
        >
          <span>Details</span>
          <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>
    </div>
  );
};

export default TrackingKanbanCard;
