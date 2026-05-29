const cron = require('node-cron');
const Shipment = require('../models/Shipment');
const ImportOrder = require('../models/ImportOrder');
const ExportOrder = require('../models/ExportOrder');
const Dispatch = require('../models/Dispatch');
const Notification = require('../models/Notification');
const { getCarrierAdapter } = require('../utils/carriers');
const detectDelay = require('../utils/delayDetector');
const syncSchedule = require('../utils/scheduleSync');

/**
 * Polls active carrier tracking details, pushes events, updates estimated ETA,
 * triggers delay notifications, and propagates status changes to orders.
 */
const runCarrierPoll = async () => {
  try {
    console.log('[CRON] Starting active shipment carrier polling...');
    
    // Find active shipments (not delivered or cancelled)
    const activeShipments = await Shipment.find({
      status: { $nin: ['delivered', 'cancelled'] }
    });

    let updatedCount = 0;

    for (const shipment of activeShipments) {
      const adapter = getCarrierAdapter(shipment.carrierCode);
      
      // Fetch updated tracking data from adapter
      const trackingData = await adapter.track(shipment.trackingNumber, shipment);
      
      const previousStatus = shipment.status;
      const previousIsDelayed = shipment.isDelayed;
      const previousDelayDays = shipment.delayDays;

      // Update shipment fields
      shipment.status = trackingData.status;
      shipment.currentLocation = trackingData.currentLocation;
      shipment.trackingEvents = trackingData.trackingEvents;
      
      if (trackingData.estimatedArrivalDate) {
        shipment.estimatedArrivalDate = trackingData.estimatedArrivalDate;
      }
      if (trackingData.actualArrivalDate) {
        shipment.actualArrivalDate = trackingData.actualArrivalDate;
      }

      // Detect delays
      const delayResult = detectDelay(shipment);
      shipment.isDelayed = delayResult.isDelayed;
      shipment.delayDays = delayResult.delayDays;
      shipment.delayReason = delayResult.delayReason;

      await shipment.save();
      await syncSchedule(shipment);

      // 1. Alert Notifications
      if (shipment.isDelayed && (!previousIsDelayed || shipment.delayDays > previousDelayDays)) {
        await Notification.create({
          title: `⚠️ Shipment Delay: ${shipment.shipmentNumber}`,
          message: `Shipment ${shipment.shipmentNumber} (${shipment.carrierName}) has been delayed by ${shipment.delayDays} day(s). Reason: ${shipment.delayReason || 'Transit delay'}`,
          type: 'delay_alert',
          shipment: shipment._id
        });
      }

      if (shipment.status !== previousStatus) {
        await Notification.create({
          title: `🚚 Shipment Update: ${shipment.shipmentNumber}`,
          message: `Shipment ${shipment.shipmentNumber} status changed from ${previousStatus} to ${shipment.status}. Location: ${shipment.currentLocation?.name || 'N/A'}`,
          type: 'carrier_update',
          shipment: shipment._id
        });

        // 2. Propagate Status updates to linked orders / dispatches
        await propagateStatusUpdate(shipment);
      }

      updatedCount++;
    }

    console.log(`[CRON] Carrier polling complete. Polled and updated ${updatedCount} active shipments.`);
  } catch (error) {
    console.error('[CRON ERROR] Failed to run carrier polling:', error);
  }
};

/**
 * Propagates shipment status changes to linked models (ImportOrder, ExportOrder, Dispatch).
 */
const propagateStatusUpdate = async (shipment) => {
  try {
    const { status, direction, importOrder, exportOrder, dispatch: dispatchId } = shipment;

    if (direction === 'inbound' && importOrder) {
      const io = await ImportOrder.findById(importOrder);
      if (io) {
        let orderStatus = io.status;
        if (status === 'in_transit') {
          orderStatus = 'in_transit';
        } else if (status === 'delivered') {
          orderStatus = 'received'; // Marks order as received upon delivery
          io.actualDeliveryDate = new Date();
        }
        if (orderStatus !== io.status) {
          io.status = orderStatus;
          await io.save();
          console.log(`[PROPAGATE] Updated ImportOrder ${io.poNumber} status to ${orderStatus}`);
        }
      }
    }

    if (direction === 'outbound' && exportOrder) {
      const eo = await ExportOrder.findById(exportOrder);
      if (eo) {
        let orderStatus = eo.status;
        if (status === 'in_transit') {
          orderStatus = 'in_transit';
        } else if (status === 'delivered') {
          orderStatus = 'delivered';
          eo.actualDeliveryDate = new Date(); // assuming actualDeliveryDate exists
        }
        if (orderStatus !== eo.status) {
          eo.status = orderStatus;
          await eo.save();
          console.log(`[PROPAGATE] Updated ExportOrder ${eo.orderNumber} status to ${orderStatus}`);
        }
      }
    }

    if (dispatchId) {
      const disp = await Dispatch.findById(dispatchId);
      if (disp) {
        let dispStatus = disp.status;
        if (status === 'in_transit') {
          dispStatus = 'in_transit';
        } else if (status === 'delivered') {
          dispStatus = 'delivered';
          disp.deliveredDate = new Date();
        }
        if (dispStatus !== disp.status) {
          disp.status = dispStatus;
          await disp.save();
          console.log(`[PROPAGATE] Updated Dispatch ${disp.dispatchNumber || disp._id} status to ${dispStatus}`);
        }
      }
    }
  } catch (err) {
    console.error(`[PROPAGATE ERROR] Failed to propagate status from shipment ${shipment.shipmentNumber}:`, err);
  }
};

/**
 * Initializes the carrier polling job to run every 2 hours.
 */
const initCarrierPollCron = () => {
  cron.schedule('0 */2 * * *', runCarrierPoll);
  console.log('[CRON] Active carrier tracker polling worker initialized.');
};

module.exports = {
  initCarrierPollCron,
  runCarrierPoll
};
