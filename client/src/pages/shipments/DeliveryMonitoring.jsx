import React from 'react';
import { Ship, Plane, Truck, Activity, RefreshCw } from 'lucide-react';
import { useShipments } from '../../hooks/useShipments';
import DeliveryMonitoringCard from '../../components/shipments/DeliveryMonitoringCard';

const DeliveryMonitoring = () => {
  // Query all active/pending shipments (excluding delivered & cancelled)
  const { data, isLoading, refetch } = useShipments({
    limit: 100,
    status: 'scheduled,in_transit,at_port,customs,out_for_delivery,exception'
  });

  const shipments = data?.shipments || [];

  // Group shipments by category
  const columns = {
    sea: {
      title: 'Sea Freight',
      icon: <Ship className="h-4.5 w-4.5 text-sky-600" />,
      bg: 'bg-sky-50/50 dark:bg-sky-950/5 border-sky-100 dark:border-sky-900/30',
      shipments: shipments.filter(s => s.shippingMethod === 'sea')
    },
    air: {
      title: 'Air Cargo',
      icon: <Plane className="h-4.5 w-4.5 text-indigo-600" />,
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/5 border-indigo-100 dark:border-indigo-900/30',
      shipments: shipments.filter(s => s.shippingMethod === 'air')
    },
    roadRail: {
      title: 'Road & Rail',
      icon: <Truck className="h-4.5 w-4.5 text-emerald-600" />,
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/5 border-emerald-100 dark:border-emerald-900/30',
      shipments: shipments.filter(s => s.shippingMethod === 'road' || s.shippingMethod === 'rail')
    },
    courier: {
      title: 'Courier Express',
      icon: <Activity className="h-4.5 w-4.5 text-purple-600" />,
      bg: 'bg-purple-50/50 dark:bg-purple-950/5 border-purple-100 dark:border-purple-900/30',
      shipments: shipments.filter(s => s.shippingMethod === 'courier')
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* Title section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Logistics Pipeline Monitor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time visual monitoring board of active inbound & outbound transits grouped by transport modes.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all bg-white dark:bg-slate-900 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Board
        </button>
      </div>

      {/* Grid of Lanes */}
      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {Object.entries(columns).map(([key, col]) => (
            <div 
              key={key} 
              className={`rounded-2xl border p-4 flex flex-col min-h-[600px] shadow-sm ${col.bg}`}
            >
              {/* Lane Header */}
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200/50 dark:border-slate-800/80">
                <div className="flex items-center gap-2 font-extrabold text-slate-850 dark:text-slate-100 text-sm">
                  {col.icon}
                  <h3>{col.title}</h3>
                </div>
                <span className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-full text-xs font-bold text-slate-600 dark:text-slate-400">
                  {col.shipments.length}
                </span>
              </div>

              {/* Lane Body Cards */}
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[750px] pr-1">
                {col.shipments.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs italic">
                    No active cargos in transit.
                  </div>
                ) : (
                  col.shipments.map(shipment => (
                    <DeliveryMonitoringCard 
                      key={shipment._id} 
                      shipment={shipment} 
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryMonitoring;
