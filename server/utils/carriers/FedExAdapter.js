/**
 * FedEx tracking adapter.
 * Simulates real-time API polling and event updates based on transit elapsed time.
 */
class FedExAdapter {
  async track(trackingNumber, shipment) {
    const origin = shipment.origin;
    const dest = shipment.destination;
    
    // Default dates if not set
    const departure = shipment.departureDate ? new Date(shipment.departureDate) : new Date(shipment.createdAt);
    const estimated = shipment.estimatedArrivalDate ? new Date(shipment.estimatedArrivalDate) : new Date(departure.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days
    
    const now = new Date();
    
    // Compute progress ratio (0 to 1)
    const totalDuration = estimated.getTime() - departure.getTime();
    let progress = totalDuration > 0 ? (now.getTime() - departure.getTime()) / totalDuration : 0;
    progress = Math.max(0, Math.min(1, progress));
    
    // Standard FedEx status stages
    const stages = [
      { ratio: 0.0, status: 'scheduled', location: origin.name, desc: 'Picked up by FedEx' },
      { ratio: 0.2, status: 'in_transit', location: origin.name, desc: 'Arrived at FedEx origin facility' },
      { ratio: 0.4, status: 'in_transit', location: 'FedEx Hub', desc: 'In transit to destination' },
      { ratio: 0.6, status: 'in_transit', location: dest.name, desc: 'Arrived at FedEx local facility' },
      { ratio: 0.8, status: 'customs', location: dest.name, desc: 'Customs clearance status updated - Released' },
      { ratio: 0.9, status: 'out_for_delivery', location: dest.name, desc: 'On FedEx vehicle for delivery' },
      { ratio: 1.0, status: 'delivered', location: dest.name, desc: 'Delivered - Signature on file' }
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
        description: `[FedEx] ${s.desc}`,
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

module.exports = new FedExAdapter();
