/**
 * Maersk tracking adapter.
 * Simulates real-time ocean cargo tracking.
 */
class MaerskAdapter {
  async track(trackingNumber, shipment) {
    const origin = shipment.origin;
    const dest = shipment.destination;
    
    // Default dates if not set
    const departure = shipment.departureDate ? new Date(shipment.departureDate) : new Date(shipment.createdAt);
    const estimated = shipment.estimatedArrivalDate ? new Date(shipment.estimatedArrivalDate) : new Date(departure.getTime() + 20 * 24 * 60 * 60 * 1000); // 20 days
    
    const now = new Date();
    
    // Compute progress ratio (0 to 1)
    const totalDuration = estimated.getTime() - departure.getTime();
    let progress = totalDuration > 0 ? (now.getTime() - departure.getTime()) / totalDuration : 0;
    progress = Math.max(0, Math.min(1, progress));
    
    // Standard Maersk status stages for Ocean Freight
    const stages = [
      { ratio: 0.0, status: 'scheduled', location: origin.name, desc: 'Container gate-in at export terminal' },
      { ratio: 0.1, status: 'scheduled', location: origin.name, desc: 'Loaded on board vessel' },
      { ratio: 0.2, status: 'in_transit', location: origin.name, desc: 'Vessel departed origin port' },
      { ratio: 0.5, status: 'in_transit', location: 'Mid-Ocean Waypoint', desc: 'Vessel in transit (ocean voyage)' },
      { ratio: 0.75, status: 'at_port', location: dest.name, desc: 'Vessel arrived at import terminal - container discharged' },
      { ratio: 0.88, status: 'customs', location: dest.name, desc: 'Customs declaration submitted and released' },
      { ratio: 0.95, status: 'out_for_delivery', location: dest.name, desc: 'Out gate from terminal on chassis for final delivery' },
      { ratio: 1.0, status: 'delivered', location: dest.name, desc: 'Container delivered to consignee door - gate-in empty returned' }
    ];

    // Filter stages that have occurred
    const activeStages = stages.filter(s => progress >= s.ratio);
    const latestStage = activeStages[activeStages.length - 1];

    // Compute coordinates
    const lat = origin.latitude + (dest.latitude - origin.latitude) * progress;
    const lng = origin.longitude + (dest.longitude - origin.longitude) * progress;

    // Generate tracking events
    const trackingEvents = activeStages.map(s => {
      const eventTime = new Date(departure.getTime() + totalDuration * s.ratio);
      return {
        timestamp: eventTime > now ? now : eventTime,
        location: s.location,
        description: `[Maersk] ${s.desc}`,
        status: s.status,
        source: 'api',
        latitude: origin.latitude + (dest.latitude - origin.latitude) * s.ratio,
        longitude: origin.longitude + (dest.longitude - origin.longitude) * s.ratio
      };
    });

    return {
      status: latestStage.status,
      currentLocation: {
        name: latestStage.location,
        latitude: lat,
        longitude: lng
      },
      trackingEvents,
      estimatedArrivalDate: estimated,
      actualArrivalDate: progress === 1 ? estimated : null,
      isDelayed: shipment.isDelayed,
      delayDays: shipment.delayDays,
      delayReason: shipment.delayReason
    };
  }
}

module.exports = new MaerskAdapter();
