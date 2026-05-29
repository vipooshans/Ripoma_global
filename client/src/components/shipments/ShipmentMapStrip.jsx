import React, { useEffect, useRef } from 'react';

const ShipmentMapStrip = ({ origin, destination, currentLocation, isDelayed }) => {
  const mapContainerId = useRef(`map-${Math.random().toString(36).substring(2, 9)}`);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!window.L) {
      console.warn('Leaflet library (window.L) is not loaded yet.');
      return;
    }

    const L = window.L;

    // Check if we have coordinate fields
    const hasOrigin = origin && typeof origin.latitude === 'number' && typeof origin.longitude === 'number';
    const hasDest = destination && typeof destination.latitude === 'number' && typeof destination.longitude === 'number';
    const hasCurrent = currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number';

    if (!hasOrigin || !hasDest) {
      return;
    }

    // Initialize Map
    const map = L.map(mapContainerId.current, {
      zoomControl: true,
      scrollWheelZoom: false
    });
    mapRef.current = map;

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CartoDB',
      maxZoom: 18
    }).addTo(map);

    const points = [];

    // Define icons using styled DivIcon
    const originIcon = L.divIcon({
      className: 'custom-map-icon-origin',
      html: `
        <div class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-600 border-2 border-white shadow-md text-white font-bold text-[10px]">
          A
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const destIcon = L.divIcon({
      className: 'custom-map-icon-dest',
      html: `
        <div class="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 border-2 border-white shadow-md text-white font-bold text-[10px]">
          B
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const pulseColorClass = isDelayed ? 'bg-rose-500' : 'bg-sky-500';
    const pulseRingClass = isDelayed ? 'bg-rose-400' : 'bg-sky-400';
    const currentIcon = L.divIcon({
      className: 'custom-map-icon-current',
      html: `
        <div class="relative flex h-5 w-5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${pulseRingClass} opacity-75"></span>
          <span class="relative inline-flex rounded-full h-5 w-5 ${pulseColorClass} border-2 border-white shadow-md"></span>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    // Add Origin Marker
    const originLatLng = [origin.latitude, origin.longitude];
    L.marker(originLatLng, { icon: originIcon })
      .addTo(map)
      .bindPopup(`<strong class="text-slate-800">Origin</strong><br/>${origin.name}`);
    points.push(originLatLng);

    // Add Current Location Marker
    if (hasCurrent) {
      const currentLatLng = [currentLocation.latitude, currentLocation.longitude];
      L.marker(currentLatLng, { icon: currentIcon })
        .addTo(map)
        .bindPopup(`<strong class="text-slate-800">Current Position</strong><br/>${currentLocation.name || 'In Transit'}`);
      points.push(currentLatLng);
    }

    // Add Destination Marker
    const destLatLng = [destination.latitude, destination.longitude];
    L.marker(destLatLng, { icon: destIcon })
      .addTo(map)
      .bindPopup(`<strong class="text-slate-800">Destination</strong><br/>${destination.name}`);
    points.push(destLatLng);

    // Draw Route Polyline
    L.polyline(points, {
      color: '#0D9488', // Teal
      weight: 3,
      opacity: 0.8,
      dashArray: '5, 8'
    }).addTo(map);

    // Fit map bounds to show all markers
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [origin, destination, currentLocation, isDelayed]);

  const hasCoordinates = origin && typeof origin.latitude === 'number' && typeof origin.longitude === 'number' &&
                         destination && typeof destination.latitude === 'number' && typeof destination.longitude === 'number';

  if (!hasCoordinates) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800/60 rounded-xl h-60 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        <span>Coordinate information is missing for this shipment.</span>
        <span className="text-xs text-slate-400/80 mt-1">Please configure coordinates to view live transit map.</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-72 rounded-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800">
      <div id={mapContainerId.current} className="w-full h-full z-10" />
      <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-medium text-slate-500 dark:text-slate-400 z-20 flex gap-4 select-none">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block border border-white" />
          A: Origin
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block border border-white" />
          B: Destination
        </span>
        <span className="flex items-center gap-1.5 animate-pulse">
          <span className={`w-2.5 h-2.5 rounded-full ${isDelayed ? 'bg-rose-500' : 'bg-sky-500'} inline-block border border-white`} />
          Current Position
        </span>
      </div>
    </div>
  );
};

export default ShipmentMapStrip;
