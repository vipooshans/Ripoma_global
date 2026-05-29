import React, { useEffect, useRef } from 'react';

const WorldMapOverview = ({ shipments }) => {
  const mapContainerId = useRef(`map-world-${Math.random().toString(36).substring(2, 9)}`);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!window.L) {
      console.warn('Leaflet library (window.L) is not loaded.');
      return;
    }

    const L = window.L;

    // Filter shipments with valid coordinates (must have current position, or origin coordinate as fallback)
    const validShipments = (shipments || []).filter(s => {
      const current = s.currentLocation || s.origin;
      return current && typeof current.latitude === 'number' && typeof current.longitude === 'number';
    });

    // Initialize Map centered on Atlantic Ocean to show Americas & EMEA/APAC nicely
    const map = L.map(mapContainerId.current, {
      zoomControl: true,
      minZoom: 1.5,
      scrollWheelZoom: true
    }).setView([20, -10], 2);
    
    mapRef.current = map;

    // Voyager tile layer (sleek grey/teal styled world map)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CartoDB',
      maxZoom: 10
    }).addTo(map);

    const markerPoints = [];

    validShipments.forEach(s => {
      const currentPos = s.currentLocation && typeof s.currentLocation.latitude === 'number' 
        ? s.currentLocation 
        : s.origin;
      
      const lat = currentPos.latitude;
      const lng = currentPos.longitude;
      
      markerPoints.push([lat, lng]);

      // Determine dot styles
      let colorClass = 'bg-teal-500';
      let ringClass = 'bg-teal-400';
      if (s.isDelayed) {
        colorClass = 'bg-rose-500 animate-pulse';
        ringClass = 'bg-rose-400';
      } else if (s.direction === 'outbound') {
        colorClass = 'bg-orange-500';
        ringClass = 'bg-orange-400';
      }

      const icon = L.divIcon({
        className: 'custom-world-icon',
        html: `
          <div class="relative flex h-4.5 w-4.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${ringClass} opacity-70"></span>
            <span class="relative inline-flex rounded-full h-4.5 w-4.5 ${colorClass} border-2 border-white shadow-md"></span>
          </div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      // Marker popup content
      const popupHTML = `
        <div class="p-2 space-y-1.5 font-sans min-w-[200px]">
          <div class="flex justify-between items-center">
            <a href="/shipments/${s._id}" class="text-xs font-bold text-teal-600 hover:underline">${s.shipmentNumber}</a>
            <span class="text-[9px] uppercase px-1 py-0.2 rounded font-bold border ${
              s.direction === 'inbound' 
                ? 'bg-teal-50 text-teal-700 border-teal-200' 
                : 'bg-orange-50 text-orange-700 border-orange-200'
            }">${s.direction}</span>
          </div>
          <div class="text-[10px] text-slate-500 font-semibold">${s.carrierName} (${s.shippingMethod})</div>
          <div class="text-[11px] text-slate-700 font-medium">Route: <strong>${s.origin?.name}</strong> ➡️ <strong>${s.destination?.name}</strong></div>
          <div class="text-[10px] text-slate-600">Status: <span class="capitalize font-medium">${s.status}</span></div>
          ${s.isDelayed ? `<div class="text-[10px] text-rose-600 font-bold">Delay: +${s.delayDays} day(s)</div>` : ''}
          <div class="pt-1.5 border-t border-slate-100 flex justify-end">
            <a href="/shipments/${s._id}" class="text-[10px] text-white bg-teal-600 px-2 py-1 rounded font-bold hover:bg-teal-700">Track shipment</a>
          </div>
        </div>
      `;

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(popupHTML);

      // Light transit lines connecting Route
      const hasOrigin = s.origin && typeof s.origin.latitude === 'number' && typeof s.origin.longitude === 'number';
      const hasDest = s.destination && typeof s.destination.latitude === 'number' && typeof s.destination.longitude === 'number';
      if (hasOrigin && hasDest) {
        L.polyline([
          [s.origin.latitude, s.origin.longitude],
          [lat, lng],
          [s.destination.latitude, s.destination.longitude]
        ], {
          color: s.direction === 'inbound' ? '#0D9488' : '#F97316',
          weight: 1.5,
          opacity: 0.4,
          dashArray: '4, 6'
        }).addTo(map);
      }
    });

    // If there are multiple active markers, fit map to fit bounds
    if (markerPoints.length > 0) {
      const bounds = L.latLngBounds(markerPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [shipments]);

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-900">
      <div id={mapContainerId.current} className="w-full h-full z-10" />
      <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg shadow-md z-20 text-[10px] font-semibold text-slate-600 dark:text-slate-400 space-y-1.5 pointer-events-none select-none">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-teal-500 border border-white" />
          <span>Active Inbound (Imports)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500 border border-white" />
          <span>Active Outbound (Exports)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 border border-white animate-pulse" />
          <span>Delayed Transit Cargo</span>
        </div>
      </div>
    </div>
  );
};

export default WorldMapOverview;
