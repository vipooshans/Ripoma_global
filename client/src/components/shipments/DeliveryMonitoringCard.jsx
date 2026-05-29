import React from 'react';
import { Link } from 'react-router-dom';
import { Ship, Plane, Truck, Anchor, Calendar, MapPin, ArrowRight } from 'lucide-react';
import ShipmentStatusBadge from './ShipmentStatusBadge';
import DirectionBadge from './DirectionBadge';
import DelayPill from './DelayPill';

const methodIcons = {
  sea: <Ship className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
  air: <Plane className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
  road: <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  rail: <Truck className="h-4 w-4 text-orange-600 dark:text-orange-400" />, // using Truck as substitute for rail
  courier: <Anchor className="h-4 w-4 text-purple-600 dark:text-purple-400" /> // using Anchor / generic
};

const DeliveryMonitoringCard = ({ shipment }) => {
  const {
    _id,
    shipmentNumber,
    direction,
    carrierName,
    shippingMethod,
    origin,
    destination,
    estimatedArrivalDate,
    isDelayed,
    delayDays,
    delayReason
  } = shipment;

  const methodIcon = methodIcons[shippingMethod?.toLowerCase()] || <Truck className="h-4 w-4 text-slate-500" />;

  const formatShortDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <Link 
            to={`/shipments/${_id}`} 
            className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 hover:underline"
          >
            {shipmentNumber}
          </Link>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {carrierName}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <DirectionBadge direction={direction} />
          <DelayPill isDelayed={isDelayed} delayDays={delayDays} reason={delayReason} />
        </div>
      </div>

      {/* Origin/Destination Route */}
      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-md p-2 text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
          <span className="truncate" title={origin?.name}>{origin?.name || 'Origin'}</span>
        </div>
        <div className="pl-4 border-l border-dashed border-slate-300 dark:border-slate-700 h-2 ml-1.5" />
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium">
          <MapPin className="h-3 w-3 text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <span className="truncate" title={destination?.name}>{destination?.name || 'Destination'}</span>
        </div>
      </div>

      {/* Footer Details */}
      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          {methodIcon}
          <span className="capitalize">{shippingMethod}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
          <Calendar className="h-3 w-3 text-slate-400" />
          <span>ETA: {formatShortDate(estimatedArrivalDate)}</span>
        </div>
      </div>
    </div>
  );
};

export default DeliveryMonitoringCard;
