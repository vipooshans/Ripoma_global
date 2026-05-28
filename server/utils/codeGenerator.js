const Counter = require('../models/Counter');

/**
 * Atomically increments a named counter and returns a zero-padded code string.
 * @param {string} counterName - e.g. 'supplier' or 'customer'
 * @param {string} prefix - e.g. 'SUP' or 'CUS'
 * @returns {Promise<string>} e.g. 'SUP-00042'
 */
const generateCode = async (counterName, prefix) => {
  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  const padded = String(counter.seq).padStart(5, '0');
  return `${prefix}-${padded}`;
};

const generateSupplierCode = () => generateCode('supplier', 'SUP');
const generateCustomerCode = () => generateCode('customer', 'CUS');

module.exports = { generateSupplierCode, generateCustomerCode };
