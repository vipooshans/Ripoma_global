const mongoose = require('mongoose');
const Customer = require('../models/Customer');

/**
 * Checks if a customer's credit limit is exceeded by adding the proposed order amount
 * to their current outstanding balance.
 * 
 * @param {String|Object} customerInput - Customer ID or Customer document
 * @param {Number} proposedTotal - Grand total of the new order
 * @returns {Promise<Object>} - Object with check results: { exceedsLimit, creditLimit, outstandingBalance, proposedTotal, warning }
 */
const checkCreditLimit = async (customerInput, proposedTotal = 0) => {
  let customer = customerInput;

  if (typeof customerInput === 'string' || mongoose.isValidObjectId(customerInput)) {
    customer = await Customer.findById(customerInput);
  }

  if (!customer) {
    return {
      exceedsLimit: false,
      creditLimit: 0,
      outstandingBalance: 0,
      proposedTotal,
      warning: 'Customer not found.'
    };
  }

  const limit = customer.creditLimit || 0;
  const balance = customer.outstandingBalance || 0;
  const totalProposed = parseFloat(proposedTotal) || 0;

  // If creditLimit is 0, it means unlimited or no credit limit checks? Wait! Usually, if credit limit is 0, it means they have 0 credit (must pay upfront). Let's treat it as a limit of 0.
  // Wait, let's make it so if limit is 0, any total > 0 exceeds the limit, unless outstanding balance + total = 0.
  const exceeds = (balance + totalProposed) > limit;

  return {
    exceedsLimit: exceeds,
    creditLimit: limit,
    outstandingBalance: balance,
    proposedTotal: totalProposed,
    warning: exceeds ? `Order of ${totalProposed} exceeds credit limit. Current Outstanding: ${balance}, Limit: ${limit}.` : null
  };
};

module.exports = checkCreditLimit;
