import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { useShippingSchedule } from '../../hooks/useShippingSchedule';
import { 
  Calendar as CalendarIcon, ArrowLeft, Info, HelpCircle, 
  MapPin, Clock, Eye 
} from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

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

// Event style configurations by eventType
const eventStyles = {
  departure: {
    bg: '#475569', // Slate 600
    border: 'border-slate-700'
  },
  arrival: {
    bg: '#0D9488', // Teal 600
    border: 'border-teal-700 font-bold'
  },
  transit: {
    bg: '#3b82f6', // Blue 500
    border: 'border-blue-600'
  },
  customs: {
    bg: '#7c3aed', // Purple 600
    border: 'border-purple-700'
  },
  delivery: {
    bg: '#ea580c', // Orange 600
    border: 'border-orange-700'
  }
};

const ShippingSchedule = () => {
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch all calendar milestones
  const { data: scheduleEntries, isLoading } = useShippingSchedule();

  // Map to react-big-calendar events format
  const events = (scheduleEntries || []).map(entry => {
    const start = new Date(entry.startDate);
    const end = new Date(entry.endDate);
    
    // For allDay span transit lines, extend the end date by 1 day so it renders fully on the grid
    if (entry.eventType === 'transit') {
      end.setDate(end.getDate() + 1);
    }

    return {
      id: entry._id,
      title: entry.title,
      start,
      end,
      allDay: true,
      resource: entry
    };
  });

  const eventPropGetter = (event) => {
    const type = event.resource?.eventType || 'transit';
    const style = eventStyles[type] || eventStyles.transit;
    
    return {
      style: {
        backgroundColor: style.bg,
        borderColor: style.bg,
        color: '#FFFFFF',
        borderRadius: '6px',
        fontSize: '11px',
        padding: '2px 6px',
        borderLeft: '4px solid rgba(0, 0, 0, 0.2)'
      }
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-5.5 w-5.5 text-teal-600" />
            Global Shipping Schedule
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive shipping log calendar mapping departures, arrivals, customs releases, and transit timelines.
          </p>
        </div>
      </div>

      {/* Main Grid: Calendar (Left) & Sidebar details (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Calendar Panel */}
        <div className="xl:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          {isLoading ? (
            <div className="flex h-[600px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
            </div>
          ) : (
            <div className="h-[650px] text-xs font-semibold text-slate-700 dark:text-slate-350">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                eventPropGetter={eventPropGetter}
                onSelectEvent={handleSelectEvent}
                views={['month', 'week', 'agenda']}
                defaultView="month"
              />
            </div>
          )}
        </div>

        {/* Selected Event Details Panel */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 min-h-[300px]">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <Info className="h-4.5 w-4.5 text-teal-600" />
              Milestone Details
            </h2>

            {!selectedEvent ? (
              <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <HelpCircle className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                <span>Click a calendar block event to view logistics details here.</span>
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Event Name */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Event Title</span>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedEvent.title}</div>
                </div>

                {/* Event Type & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Milestone Type</span>
                    <span className="capitalize font-bold text-slate-750 dark:text-slate-300">{selectedEvent.eventType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Status</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                      selectedEvent.status === 'completed' 
                        ? 'bg-teal-50 text-teal-700 border-teal-200' 
                        : selectedEvent.status === 'delayed'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Start Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(selectedEvent.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">End Date</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(selectedEvent.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedEvent.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Notes</span>
                    <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/25 p-2 rounded-lg italic">
                      {selectedEvent.notes}
                    </p>
                  </div>
                )}

                {/* Shipment Redirection Link */}
                {selectedEvent.shipment && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Linked Shipment</span>
                      <strong className="text-slate-700 dark:text-slate-300">
                        {selectedEvent.shipment.shipmentNumber || 'SHP-XXXX'}
                      </strong>
                    </div>
                    <Link
                      to={`/shipments/${selectedEvent.shipment._id || selectedEvent.shipment}`}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                      Track Route
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Color Guide / Legend */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-xs font-semibold text-slate-500 space-y-3">
            <h3 className="text-slate-800 dark:text-slate-200 font-bold">Milestone Legend</h3>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-600 inline-block border border-white" />
                <span>Departure Port</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-teal-600 inline-block border border-white" />
                <span>Arrival ETA</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-blue-500 inline-block border border-white" />
                <span>Sea/Air Transit</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-purple-650 inline-block border border-white" style={{ backgroundColor: '#7c3aed' }} />
                <span>Customs Gate</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingSchedule;
