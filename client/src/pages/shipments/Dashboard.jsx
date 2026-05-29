import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Ship, Plane, Truck, Activity, Bell, RefreshCw, AlertTriangle, 
  MapPin, Calendar, Clock, Inbox, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';
import { useShipmentDashboard, useTriggerCarrierPoll, useShipments, useMarkNotificationRead } from '../../hooks/useShipments';
import WorldMapOverview from '../../components/shipments/WorldMapOverview';
import ShipmentStatusBadge from '../../components/shipments/ShipmentStatusBadge';
import DirectionBadge from '../../components/shipments/DirectionBadge';

// Helper to compute countdown string
const getCountdown = (etaDateString) => {
  if (!etaDateString) return 'N/A';
  const now = new Date();
  const eta = new Date(etaDateString);
  const diffTime = eta.getTime() - now.getTime();
  
  if (diffTime < 0) {
    const diffDays = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
    return `Arrived ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays === 0) {
    if (diffHours === 0) return 'Arriving now';
    return `Arriving in ${diffHours}h`;
  }
  return `In ${diffDays}d ${diffHours}h`;
};

const Dashboard = () => {
  const { data: dashboardData, isLoading: statsLoading, refetch: refetchStats } = useShipmentDashboard();
  // Fetch active shipments for the global map
  const { data: activeData, isLoading: shipmentsLoading } = useShipments({
    limit: 100,
    status: 'scheduled,in_transit,at_port,customs,out_for_delivery'
  });
  
  const pollMutation = useTriggerCarrierPoll();
  const markReadMutation = useMarkNotificationRead();

  const [polling, setPolling] = useState(false);

  const handlePoll = async () => {
    setPolling(true);
    try {
      await pollMutation.mutateAsync();
      await refetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setPolling(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markReadMutation.mutateAsync(id);
      refetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const stats = dashboardData?.stats || {};
  const arrivingSoon = stats.arrivingSoon || [];
  const notifications = stats.recentNotifications || [];
  const activeShipmentsList = activeData?.shipments || [];

  if (statsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2">
      {/* Title & Poll Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Logistics & Shipping Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time global tracking, carrier polling, and delivery pipeline monitoring.
          </p>
        </div>
        <button
          onClick={handlePoll}
          disabled={polling}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-950 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${polling ? 'animate-spin' : ''}`} />
          {polling ? 'Polling Carrier Feeds...' : 'Sync Carrier APIs'}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Shipments</span>
            <span className="p-2 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 rounded-lg">
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.activeCount || 0}</div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Currently in transit or port stages</p>
          </div>
        </div>

        {/* Inbound */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Inbound Cargo (PO)</span>
            <span className="p-2 bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 rounded-lg">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.inboundCount || 0}</div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Import orders scheduled/shipping</p>
          </div>
        </div>

        {/* Outbound */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Outbound Cargo (SO)</span>
            <span className="p-2 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded-lg">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.outboundCount || 0}</div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Export sales dispatches in transit</p>
          </div>
        </div>

        {/* Delayed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Delayed Shipments</span>
            <span className={`p-2 rounded-lg ${stats.delayedCount > 0 ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className={`h-4 w-4 ${stats.delayedCount > 0 ? 'animate-bounce' : ''}`} />
            </span>
          </div>
          <div>
            <div className={`text-3xl font-extrabold ${stats.delayedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {stats.delayedCount || 0}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Slipped beyond original estimates</p>
          </div>
        </div>
      </div>

      {/* Global Live Tracking Map */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">Global Transit Overview</h2>
          <Link to="/shipments/all" className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline">
            View All Shipments &rarr;
          </Link>
        </div>
        {shipmentsLoading ? (
          <div className="w-full h-[400px] bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
            <div className="text-sm text-slate-400">Loading map elements...</div>
          </div>
        ) : (
          <WorldMapOverview shipments={activeShipmentsList} />
        )}
      </div>

      {/* Two Columns: Arriving Soon & Recent Activity logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Arriving soon */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-teal-600" />
            Upcoming Cargo Arrivals (Next 5 Days)
          </h3>
          
          {arrivingSoon.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No shipments scheduled to arrive in the next 5 days.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {arrivingSoon.map(shipment => {
                const countdown = getCountdown(shipment.estimatedArrivalDate);
                const isLate = shipment.isDelayed;

                return (
                  <div key={shipment._id} className="py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3 first:pt-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/shipments/${shipment._id}`} className="text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-teal-600 hover:underline">
                          {shipment.shipmentNumber}
                        </Link>
                        <DirectionBadge direction={shipment.direction} />
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-3">
                        <span className="font-semibold">{shipment.carrierName}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {shipment.destination?.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left sm:text-right">
                        <div className={`text-xs font-extrabold flex items-center gap-1.5 ${isLate ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400'}`}>
                          <Clock className="h-3.5 w-3.5" />
                          {countdown}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          ETA: {new Date(shipment.estimatedArrivalDate).toLocaleDateString()}
                        </div>
                      </div>
                      <ShipmentStatusBadge status={shipment.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications & Log updates */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-md font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="h-4.5 w-4.5 text-teal-600" />
            Logistics Alerts & Updates
          </h3>

          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              All quiet. No recent alerts or updates logged.
            </div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {notifications.map(n => {
                const isDelay = n.type === 'delay_alert';
                return (
                  <div 
                    key={n._id} 
                    className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                      n.isRead 
                        ? 'bg-slate-50/50 dark:bg-slate-800/10 border-slate-100 dark:border-slate-800/40 text-slate-500' 
                        : isDelay
                          ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/40 text-slate-800 dark:text-slate-200'
                          : 'bg-teal-50/20 dark:bg-teal-950/10 border-teal-100 dark:border-teal-900/40 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                      isDelay 
                        ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' 
                        : 'bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
                    }`}>
                      {isDelay ? <AlertTriangle className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                    </span>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold truncate leading-tight">{n.title}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed break-words">{n.message}</p>
                      
                      <div className="flex items-center justify-between pt-1">
                        {n.shipment && (
                          <Link 
                            to={`/shipments/${n.shipment._id || n.shipment}`} 
                            className="text-[10px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline"
                          >
                            View Shipment details &rarr;
                          </Link>
                        )}
                        {!n.isRead && (
                          <button
                            onClick={() => handleMarkRead(n._id)}
                            className="text-[9px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-auto cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
