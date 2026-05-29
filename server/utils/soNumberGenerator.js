const Counter = require('../models/Counter');

/**
 * Generates year-aware sequential code numbers for export orders, invoices, and dispatches.
 * Format: PREFIX-YYYY-XXXXX (e.g. SO-2026-00001, INV-2026-00001, DSP-2026-00001)
 */
const generateExportNumber = async (type) => {
  const currentYear = new Date().getFullYear();
  const counterKey = `${type}_${currentYear}`;

  const counter = await Counter.findOneAndUpdate(
    { name: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  let prefix = 'SO';
  if (type === 'exportOrder') {
    prefix = 'SO';
  } else if (type === 'invoice') {
    prefix = 'INV';
  } else if (type === 'dispatch') {
    prefix = 'DSP';
  }

  const paddedSeq = String(counter.seq).padStart(5, '0');
  return `${prefix}-${currentYear}-${paddedSeq}`;
};

module.exports = generateExportNumber;
