/**
 * Manual tracking adapter fallback.
 * Simply returns the shipment's current state without generating automatic updates.
 */
class ManualAdapter {
  async track(trackingNumber, shipment) {
    // For manual shipments, we do not auto-poll or auto-increment tracking events.
    // We just return the current status, location, and events.
    return {
      status: shipment.status || 'scheduled',
      currentLocation: shipment.currentLocation || shipment.origin,
      trackingEvents: shipment.trackingEvents || [],
      estimatedArrivalDate: shipment.estimatedArrivalDate,
      actualArrivalDate: shipment.actualArrivalDate,
      isDelayed: shipment.isDelayed,
      delayDays: shipment.delayDays,
      delayReason: shipment.delayReason
    };
  }
}

module.exports = new ManualAdapter();
