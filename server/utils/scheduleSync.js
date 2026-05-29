const ShippingScheduleEntry = require('../models/ShippingScheduleEntry');

/**
 * Synchronizes the ShippingScheduleEntry collection for a given shipment.
 * Deletes past schedule entries for this shipment and regenerates them
 * based on current dates and status.
 * 
 * @param {Object} shipment - The populated or raw shipment document
 */
const syncSchedule = async (shipment) => {
  if (!shipment || !shipment._id) return;

  // 1. Delete all existing entries for this shipment
  await ShippingScheduleEntry.deleteMany({ shipment: shipment._id });

  // If shipment is cancelled or status is exception, we might not want transit lines
  if (shipment.status === 'cancelled') return;

  const entries = [];

  // 2. Add Departure Event
  if (shipment.departureDate) {
    const isCompleted = ['in_transit', 'at_port', 'customs', 'out_for_delivery', 'delivered'].includes(shipment.status);
    entries.push({
      shipment: shipment._id,
      title: `🚢 DEP: ${shipment.shipmentNumber} (${shipment.carrierCode})`,
      eventType: 'departure',
      startDate: shipment.departureDate,
      endDate: shipment.departureDate,
      status: isCompleted ? 'completed' : 'scheduled',
      notes: `Departing from ${shipment.origin.name}`
    });
  }

  // 3. Add Arrival Event
  const arrivalDate = shipment.actualArrivalDate || shipment.estimatedArrivalDate;
  if (arrivalDate) {
    const isCompleted = shipment.status === 'delivered';
    entries.push({
      shipment: shipment._id,
      title: `🏁 ARR: ${shipment.shipmentNumber} (${shipment.carrierCode})`,
      eventType: 'arrival',
      startDate: arrivalDate,
      endDate: arrivalDate,
      status: isCompleted ? 'completed' : (shipment.isDelayed ? 'delayed' : 'scheduled'),
      notes: `Arriving at ${shipment.destination.name}`
    });
  }

  // 4. Add Transit Duration Event (represents a span on the calendar)
  if (shipment.departureDate && arrivalDate) {
    const isCompleted = shipment.status === 'delivered';
    entries.push({
      shipment: shipment._id,
      title: `🚚 TRANSIT: ${shipment.shipmentNumber} (${shipment.origin.name} ➡️ ${shipment.destination.name})`,
      eventType: 'transit',
      startDate: shipment.departureDate,
      endDate: arrivalDate,
      status: isCompleted ? 'completed' : (shipment.isDelayed ? 'delayed' : 'scheduled'),
      notes: `Vessel/Flight: ${shipment.vesselName || shipment.flightNumber || 'N/A'}`
    });
  }

  // 5. Add Customs Event if active
  if (shipment.status === 'customs') {
    entries.push({
      shipment: shipment._id,
      title: `🛃 CUSTOMS: ${shipment.shipmentNumber}`,
      eventType: 'customs',
      startDate: new Date(),
      endDate: new Date(),
      status: 'scheduled',
      notes: 'Currently undergoing customs clearance'
    });
  }

  if (entries.length > 0) {
    await ShippingScheduleEntry.insertMany(entries);
  }
};

module.exports = syncSchedule;
