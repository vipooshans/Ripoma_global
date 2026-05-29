const cron = require('node-cron');
const ImportOrder = require('../models/ImportOrder');

/**
 * Checks for import purchase orders whose expected delivery date has passed
 * and are still in an unfulfilled status.
 */
const runOverdueDeliveryCheck = async () => {
  try {
    console.log('[CRON] Executing overdue delivery check...');
    const now = new Date();
    
    // Find orders that are approved/ordered/in_transit/partially_received and expectedDeliveryDate < now
    const overdueOrders = await ImportOrder.find({
      status: { $in: ['approved', 'ordered', 'in_transit', 'partially_received'] },
      expectedDeliveryDate: { $lt: now }
    }).populate('supplier', 'companyName code');

    let count = 0;
    for (const order of overdueOrders) {
      console.warn(
        `[CRON ALERT] Import Order ${order.poNumber} is OVERDUE! ` +
        `Supplier: ${order.supplier?.companyName} (${order.supplier?.code || 'N/A'}), ` +
        `Expected Delivery Date was: ${new Date(order.expectedDeliveryDate).toLocaleDateString()}, ` +
        `Current Status: ${order.status}`
      );
      count++;
    }

    console.log(`[CRON] Overdue delivery check complete. Detected ${count} overdue orders.`);
  } catch (error) {
    console.error('[CRON ERROR] Failed to execute overdue delivery check:', error);
  }
};

/**
 * Initialize the cron scheduler. Runs daily at midnight.
 */
const initOverdueCron = () => {
  // Run once daily at midnight: '0 0 * * *'
  cron.schedule('0 0 * * *', runOverdueDeliveryCheck);
  console.log('[CRON] Overdue delivery daily monitor worker initialized.');
};

module.exports = {
  initOverdueCron,
  runOverdueDeliveryCheck
};
