const cron = require('node-cron');
const ImportOrder = require('../models/ImportOrder');
const User = require('../models/User');
const { sendNotification } = require('../utils/notifyService');

/**
 * Checks for import purchase orders whose expected delivery date has passed
 * and are still in an unfulfilled status.
 */
const runOverdueDeliveryCheck = async () => {
  try {
    console.log('[CRON] Executing overdue delivery check...');
    const now = new Date();
    
    const overdueOrders = await ImportOrder.find({
      status: { $in: ['approved', 'ordered', 'in_transit', 'partially_received'] },
      expectedDeliveryDate: { $lt: now }
    }).populate('supplier', 'companyName code');

    const staffToNotify = await User.find({
      role: { $in: ['admin', 'manager'] },
      deleted: { $ne: true },
      status: 'active'
    });

    let count = 0;
    for (const order of overdueOrders) {
      count++;
      for (const staff of staffToNotify) {
        await sendNotification({
          recipientId: staff._id,
          type: 'shipment_delayed',
          severity: 'warning',
          title: `Delivery overdue: ${order.poNumber}`,
          body: `Import PO ${order.poNumber} from ${order.supplier?.companyName || 'supplier'} was due ${new Date(order.expectedDeliveryDate).toLocaleDateString()} (status: ${order.status}).`,
          actionUrl: `/imports/orders/${order._id}`,
          actionLabel: 'View PO',
          entityType: 'ImportOrder',
          entityId: order._id,
          entityRef: order.poNumber
        });
      }
    }

    console.log(`[CRON] Overdue delivery check complete. Detected ${count} overdue orders.`);
  } catch (error) {
    console.error('[CRON ERROR] Failed to execute overdue delivery check:', error);
  }
};

const initOverdueCron = () => {
  cron.schedule('0 0 * * *', runOverdueDeliveryCheck);
  console.log('[CRON] Overdue delivery daily monitor worker initialized.');
};

module.exports = {
  initOverdueCron,
  runOverdueDeliveryCheck
};
