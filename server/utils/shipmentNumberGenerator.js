const Counter = require('../models/Counter');

/**
 * Generates year-aware sequential code numbers for shipments.
 * Format: SHP-YYYY-XXXXX (e.g. SHP-2026-00001)
 */
const generateShipmentNumber = async () => {
  const currentYear = new Date().getFullYear();
  const counterKey = `shipment_${currentYear}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(5, '0');
  return `SHP-${currentYear}-${paddedSeq}`;
};

module.exports = generateShipmentNumber;
