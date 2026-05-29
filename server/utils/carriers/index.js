const ManualAdapter = require('./ManualAdapter');
const DHLAdapter = require('./DHLAdapter');
const FedExAdapter = require('./FedExAdapter');
const MaerskAdapter = require('./MaerskAdapter');

const adapters = {
  MANUAL: ManualAdapter,
  DHL: DHLAdapter,
  FEDEX: FedExAdapter,
  MAERSK: MaerskAdapter
};

/**
 * Returns the matching carrier adapter for a given carrier code.
 * Fallbacks to ManualAdapter if not found.
 * 
 * @param {String} carrierCode - DHL, FEDEX, MAERSK, MANUAL
 * @returns {Object} Carrier tracking adapter
 */
const getCarrierAdapter = (carrierCode) => {
  const code = (carrierCode || '').toUpperCase().trim();
  return adapters[code] || ManualAdapter;
};

module.exports = {
  getCarrierAdapter,
  adapters
};
