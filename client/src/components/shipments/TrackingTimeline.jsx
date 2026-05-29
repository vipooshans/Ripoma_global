import React from 'react';
import { Clock, MapPin, Radio, Clipboard } from 'lucide-react';

const TrackingTimeline = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
        No tracking events logged yet.
      </div>
    );
  }

  // Sort events latest first
  const sortedEvents = [...events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const formatDateTime = (d) => {
    const date = new Date(d);
    return {
      date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {sortedEvents.map((event, idx) => {
          const { date, time } = formatDateTime(event.timestamp);
          const isLatest = idx === 0;

          return (
            <li key={idx}>
              <div className="relative pb-8">
                {/* Visual Connector Line */}
                {idx !== sortedEvents.length - 1 && (
                  <span 
                    className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-800" 
                    aria-hidden="true" 
                  />
                )}
                
                <div className="relative flex space-x-3">
                  {/* Event Icon/Dot */}
                  <div>
                    <span 
                      className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-slate-900 ${
                        isLatest 
                          ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25 animate-pulse' 
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {event.source === 'api' ? (
                        <Radio className="h-5 w-5" />
                      ) : (
                        <Clipboard className="h-5 w-5" />
                      )}
                    </span>
                  </div>

                  {/* Event Content Panel */}
                  <div className="flex-1 min-w-0 pt-1.5">
                    <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 rounded-lg p-3 hover:bg-slate-100/55 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {event.description}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="inline-flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {date}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 flex items-center justify-end gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {time}
                          </span>
                        </div>
                      </div>

                      {/* Source/Metadata indicators */}
                      <div className="mt-2 flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500">
                        <span className="capitalize px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 font-medium">
                          Status: {event.status}
                        </span>
                        <span className="font-medium text-slate-400 italic">
                          Source: {event.source === 'api' ? 'Carrier API Feed' : 'Internal Staff Entry'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TrackingTimeline;
