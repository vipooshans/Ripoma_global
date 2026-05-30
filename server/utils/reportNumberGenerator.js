const Counter = require('../models/Counter');

/**
 * Generates year-aware sequential code numbers for report definitions.
 * Format: RPT-YYYY-XXXXX (e.g. RPT-2026-00012)
 * 
 * @returns {Promise<string>} Auto-generated sequential code
 */
const generateReportNumber = async () => {
  const currentYear = new Date().getFullYear();
  const counterKey = `report_${currentYear}`;
  const prefix = 'RPT';

  // Atomically increment sequence, creating it if it doesn't exist
  const counter = await Counter.findOneAndUpdate(
    { name: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(5, '0');
  return `${prefix}-${currentYear}-${paddedSeq}`;
};

module.exports = generateReportNumber;
