import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { useDeliverySchedule } from '../../hooks/useImportOrders';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Info
} from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import POStatusBadge from '../../components/imports/POStatusBadge';
import PriorityBadge from '../../components/imports/PriorityBadge';
import DeliveryCalendarEvent from '../../components/imports/DeliveryCalendarEvent';
import PODetailSlideOver from '../../components/imports/PODetailSlideOver';

// Set up localizer
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const statusColors = {
  draft: '#64748B',
  pending_approval: '#D97706',
  approved: '#2563EB',
  ordered: '#0D9488',
  in_transit: '#7C3AED',
  partially_received: '#EA580C',
  received: '#059669',
  cancelled: '#DC2626'
};

const DeliverySchedule = () => {
  const navigate = useNavigate();

  // View mode: 'calendar' or 'list'
  const [viewMode, setViewMode] = useState('calendar');
  
  // Slide-over drawer state
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Filters state
  const [selectedStatuses, setSelectedStatuses] = useState({
    approved: true,
    ordered: true,
    in_transit: true,
    partially_received: true,
    received: true
  });

  // Queries
  const { data: scheduleData, isLoading } = useDeliverySchedule();

  const handleStatusToggle = (status) => {
    setSelectedStatuses(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const handleSelectEvent = (event) => {
    setSelectedOrderId(event.resourceId);
    setSlideOverOpen(true);
  };

  const handleOpenOrderDetails = (id) => {
    setSelectedOrderId(id);
    setSlideOverOpen(true);
  };

  // Format events list for Calendar
  const orders = scheduleData?.orders || [];
  const events = orders
    .filter(o => selectedStatuses[o.status] !== false)
    .map(o => ({
      id: o._id,
      title: `${o.poNumber} — ${o.supplier?.companyName || 'Supplier'}`,
      start: new Date(o.expectedDeliveryDate),
      end: new Date(o.expectedDeliveryDate),
      allDay: true,
      resourceId: o._id,
      status: o.status,
      grandTotal: o.grandTotal
    }));

  const eventPropGetter = (event) => {
    const bg = statusColors[event.status] || '#0D9488';
    return {
      style: {
        backgroundColor: bg,
        borderRadius: '6px',
        color: '#FFFFFF',
        border: '0px',
        display: 'block',
        fontSize: '11px',
        fontWeight: 'bold',
        padding: '2px 6px'
      }
    };
  };

  // Days remaining text logic
  const getDaysRemainingText = (dateString) => {
    const deliveryDate = new Date(dateString);
    const now = new Date();
    deliveryDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    
    const diffTime = deliveryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    if (diffDays === 0) {
      return { text: 'Delivery Today', color: 'text-rose-650 bg-rose-50 border-rose-200 font-extrabold animate-pulse' };
    }
    if (diffDays < 3) {
      return { text: `${diffDays}d remaining`, color: 'text-rose-650 bg-rose-50 border-rose-200 font-bold animate-pulse' };
    }
    if (diffDays <= 7) {
      return { text: `${diffDays}d remaining`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    }
    return { text: `${diffDays}d remaining`, color: 'text-teal-705 bg-teal-50 border-teal-200' };
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Delivery Schedule</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Logistical tracking schedule representing ETA windows for cargo consignments and arrivals.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0 shadow-xs">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
          <Filter size={14} className="text-teal-650" />
          <span>Status Filters</span>
        </h3>
        <div className="flex flex-wrap gap-2.5 text-xs font-semibold text-slate-700">
          {Object.keys(selectedStatuses).map((status) => {
            const label = status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
            const color = statusColors[status];
            const isChecked = selectedStatuses[status];

            return (
              <label
                key={status}
                className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm ${
                  isChecked ? 'bg-slate-50 border-slate-350' : 'bg-white border-slate-200 opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleStatusToggle(status)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                />
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Widget / List area */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-[500px]">
        {isLoading ? (
          <div className="h-[500px] flex items-center justify-center text-slate-500 animate-pulse text-xs">
            Loading scheduled deliveries...
          </div>
        ) : viewMode === 'calendar' ? (
          <div className="h-[600px] text-xs">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventPropGetter}
              onSelectEvent={handleSelectEvent}
              views={['month', 'week', 'agenda']}
              components={{
                event: DeliveryCalendarEvent
              }}
              popup
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Upcoming Expected Consignments</h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">{
                orders.filter(o => selectedStatuses[o.status] !== false).length
              } Deliveries scheduled</span>
            </div>
            
            {orders.filter(o => selectedStatuses[o.status] !== false).length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                No upcoming scheduled deliveries fit the status filter criteria.
              </div>
            ) : (
              <div className="space-y-3 font-semibold text-xs text-slate-700">
                {[...orders]
                  .filter(o => selectedStatuses[o.status] !== false)
                  .sort((a, b) => new Date(a.expectedDeliveryDate) - new Date(b.expectedDeliveryDate))
                  .map((o) => {
                    const urgency = getDaysRemainingText(o.expectedDeliveryDate);
                    return (
                      <div 
                        key={o._id} 
                        className="border border-slate-200 rounded-xl p-4 bg-slate-50/30 hover:bg-slate-50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer shadow-xs border-l-4 border-l-teal-650"
                        onClick={() => handleOpenOrderDetails(o._id)}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{o.poNumber}</span>
                            <POStatusBadge status={o.status} />
                            <PriorityBadge priority={o.priority} />
                          </div>
                          <div className="text-[11px] text-slate-650 font-bold">
                            Supplier: <span className="text-slate-900 font-extrabold">{o.supplier?.companyName}</span>
                          </div>
                          <div className="text-[10px] text-slate-450 font-normal">
                            Expected Delivery ETA: <strong className="text-slate-750 font-bold">{new Date(o.expectedDeliveryDate).toLocaleDateString()}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-slate-950">
                              ${o.grandTotal?.toLocaleString()}
                            </div>
                            <span className="text-[9px] text-slate-400 font-normal">USD</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold text-center w-[125px] ${urgency.color}`}>
                            {urgency.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide-over details drawer popup */}
      <PODetailSlideOver
        isOpen={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        orderId={selectedOrderId}
      />
    </div>
  );
};

export default DeliverySchedule;
