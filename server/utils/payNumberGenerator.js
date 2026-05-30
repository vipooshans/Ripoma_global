const Counter = require('../models/Counter');

/**
 * Generates year-aware sequential code numbers for finance entities.
 * Format: PREFIX-YYYY-XXXXX (e.g. PAY-2025-00061, EXP-2025-00034, TAX-2025-00019)
 * 
 * @param {'payment'|'expense'|'taxDuty'} type - The financial entity type
 * @returns {Promise<string>} Auto-generated sequential code
 */
const generatePaymentNumber = async (type) => {
  const currentYear = new Date().getFullYear();
  let counterKey = '';
  let prefix = '';

  if (type === 'payment') {
    counterKey = `payment_${currentYear}`;
    prefix = 'PAY';
  } else if (type === 'expense') {
    counterKey = `expense_${currentYear}`;
    prefix = 'EXP';
  } else if (type === 'taxDuty') {
    counterKey = `taxDuty_${currentYear}`;
    prefix = 'TAX';
  } else {
    throw new Error(`Invalid counter type: ${type}`);
  }

  // Atomically increment sequence, creating it if it doesn't exist
  const counter = await Counter.findOneAndUpdate(
    { name: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSeq = String(counter.seq).padStart(5, '0');
  return `${prefix}-${currentYear}-${paddedSeq}`;
};

module.exports = generatePaymentNumber;
