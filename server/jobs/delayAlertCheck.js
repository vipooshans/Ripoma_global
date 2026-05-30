const cron = require('node-cron');
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const { sendNotification } = require('../utils/notifyService');
const detectDelay = require('../utils/delayDetector');

/**
 * Audit all active shipments daily to check for schedules that have slipped,
 * and create delay alert logs.
 */
const runDelayAlertCheck = async () => {
  try {
    console.log('[CRON] Executing daily shipment delay check audit...');
    
    // Find active shipments
    const activeShipments = await Shipment.find({
      status: { $nin: ['delivered', 'cancelled'] }
    });

    let alertCount = 0;
    const staffToNotify = await User.find({
      role: { $in: ['admin', 'manager'] },
      deleted: { $ne: true },
      status: 'active'
    });

    for (const shipment of activeShipments) {
      const delayResult = detectDelay(shipment);
      
      if (delayResult.isDelayed) {
        const previousIsDelayed = shipment.isDelayed;
        
        shipment.isDelayed = delayResult.isDelayed;
        shipment.delayDays = delayResult.delayDays;
        shipment.delayReason = delayResult.delayReason;
        await shipment.save();

        // Create alert if it was not previously flagged as delayed
        if (!previousIsDelayed) {
          for (const staff of staffToNotify) {
            await sendNotification({
              recipientId: staff._id,
              type: 'shipment_delayed',
              severity: 'warning',
              title: `⚠️ Daily Delay Alert: ${shipment.shipmentNumber}`,
              body: `Shipment ${shipment.shipmentNumber} is flagged as delayed by ${shipment.delayDays} day(s). Details: ${shipment.delayReason}`,
              actionUrl: `/logistics/shipments/${shipment._id}`,
              actionLabel: 'View Shipment Details',
              entityType: 'Shipment',
              entityId: shipment._id,
              entityRef: shipment.shipmentNumber
            });
          }
          alertCount++;
        }
      }
    }

    console.log(`[CRON] Daily delay audit complete. Flagged ${alertCount} shipments.`);
  } catch (error) {
    console.error('[CRON ERROR] Failed to run daily delay audit:', error);
  }
};

/**
 * Initializes the cron scheduler (daily at midnight).
 */
const initDelayAlertCron = () => {
  cron.schedule('0 0 * * *', runDelayAlertCheck);
  console.log('[CRON] Daily shipment delay monitor worker initialized.');
};

module.exports = {
  initDelayAlertCron,
  runDelayAlertCheck
};
