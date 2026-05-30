const Shipment = require('../models/Shipment');
const Container = require('../models/Container');
const ImportOrder = require('../models/ImportOrder');
const ExportOrder = require('../models/ExportOrder');
const Dispatch = require('../models/Dispatch');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendNotification } = require('../utils/notifyService');
const ShippingScheduleEntry = require('../models/ShippingScheduleEntry');
const generateShipmentNumber = require('../utils/shipmentNumberGenerator');
const detectDelay = require('../utils/delayDetector');
const syncSchedule = require('../utils/scheduleSync');
const { runCarrierPoll } = require('../jobs/carrierPoll');

// 1. List Shipments
exports.getShipments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      direction, 
      status, 
      carrierCode, 
      shippingMethod, 
      isDelayed, 
      sort 
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { shipmentNumber: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } },
        { carrierName: { $regex: search, $options: 'i' } },
        { mbl: { $regex: search, $options: 'i' } },
        { hbl: { $regex: search, $options: 'i' } }
      ];
    }

    if (direction) query.direction = direction;
    if (status) query.status = status;
    if (carrierCode) query.carrierCode = carrierCode.toUpperCase();
    if (shippingMethod) query.shippingMethod = shippingMethod;
    if (isDelayed !== undefined && isDelayed !== '') {
      query.isDelayed = isDelayed === 'true';
    }

    let sortOption = { createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const shipments = await Shipment.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('containers')
      .populate('importOrder', 'poNumber')
      .populate('exportOrder', 'orderNumber');

    const total = await Shipment.countDocuments(query);

    res.status(200).json({
      success: true,
      shipments,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] getShipments error:', error);
    res.status(500).json({ success: false, message: 'Server error listing shipments' });
  }
};

// 2. Get Shipment By ID
exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('containers')
      .populate('importOrder')
      .populate('exportOrder')
      .populate('goodsReceipt')
      .populate('dispatch')
      .populate('createdBy', 'name email');

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    res.status(200).json({ success: true, shipment });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] getShipmentById error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving shipment' });
  }
};

// 3. Create Shipment
exports.createShipment = async (req, res) => {
  try {
    const shipmentData = req.body;
    
    // Generate shipment number
    shipmentData.shipmentNumber = await generateShipmentNumber();
    
    // Set initial dates
    if (shipmentData.estimatedArrivalDate && !shipmentData.originalEstimatedArrivalDate) {
      shipmentData.originalEstimatedArrivalDate = shipmentData.estimatedArrivalDate;
    }
    
    shipmentData.status = shipmentData.status || 'scheduled';
    shipmentData.createdBy = req.user ? req.user._id : null;

    // Initial tracking event
    shipmentData.trackingEvents = [
      {
        timestamp: new Date(),
        location: shipmentData.origin?.name || 'Origin Port',
        description: `Shipment created under code ${shipmentData.shipmentNumber}.`,
        status: shipmentData.status,
        source: 'manual',
        latitude: shipmentData.origin?.latitude,
        longitude: shipmentData.origin?.longitude
      }
    ];

    const shipment = new Shipment(shipmentData);

    // Calculate delay
    const delayCheck = detectDelay(shipment);
    shipment.isDelayed = delayCheck.isDelayed;
    shipment.delayDays = delayCheck.delayDays;
    shipment.delayReason = delayCheck.delayReason;

    await shipment.save();

    // Link and update containers if specified
    if (shipmentData.containers && shipmentData.containers.length > 0) {
      await Container.updateMany(
        { _id: { $in: shipmentData.containers } },
        { 
          $set: { 
            status: shipment.status === 'in_transit' ? 'in_transit' : 'booked',
            currentShipment: shipment._id,
            currentLocation: shipment.origin?.name
          },
          $push: {
            history: {
              shipment: shipment._id,
              from: shipment.origin?.name,
              to: shipment.destination?.name,
              startDate: shipment.departureDate || new Date()
            }
          }
        }
      );
    }

    // Sync shipping schedule calendar
    await syncSchedule(shipment);

    res.status(201).json({ success: true, shipment });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] createShipment error:', error);
    res.status(500).json({ success: false, message: 'Server error creating shipment', error: error.message });
  }
};

// 4. Update Shipment
exports.updateShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    const previousContainers = shipment.containers.map(c => c.toString());
    const newContainers = req.body.containers || [];

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'trackingEvents' && key !== 'shipmentNumber') {
        shipment[key] = req.body[key];
      }
    });

    // Recalculate delay
    const delayCheck = detectDelay(shipment);
    shipment.isDelayed = delayCheck.isDelayed;
    shipment.delayDays = delayCheck.delayDays;
    shipment.delayReason = delayCheck.delayReason;

    await shipment.save();

    // Re-link containers
    // Unlink old containers that are no longer selected
    const unlinkedContainers = previousContainers.filter(id => !newContainers.includes(id));
    if (unlinkedContainers.length > 0) {
      await Container.updateMany(
        { _id: { $in: unlinkedContainers } },
        { $set: { status: 'available', currentShipment: null } }
      );
    }

    // Link new containers
    const linkedContainers = newContainers.filter(id => !previousContainers.includes(id));
    if (linkedContainers.length > 0) {
      await Container.updateMany(
        { _id: { $in: linkedContainers } },
        { 
          $set: { 
            status: shipment.status === 'in_transit' ? 'in_transit' : 'booked',
            currentShipment: shipment._id,
            currentLocation: shipment.currentLocation?.name || shipment.origin?.name
          },
          $push: {
            history: {
              shipment: shipment._id,
              from: shipment.origin?.name,
              to: shipment.destination?.name,
              startDate: shipment.departureDate || new Date()
            }
          }
        }
      );
    }

    // Sync schedule
    await syncSchedule(shipment);

    res.status(200).json({ success: true, shipment });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] updateShipment error:', error);
    res.status(500).json({ success: false, message: 'Server error updating shipment' });
  }
};

// 5. Add Tracking Event Manually
exports.addTrackingEvent = async (req, res) => {
  try {
    const { location, description, status, latitude, longitude } = req.body;
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    // Create event
    const newEvent = {
      timestamp: new Date(),
      location,
      description,
      status,
      source: 'manual',
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined
    };

    shipment.trackingEvents.push(newEvent);

    // Advance status and current location if updated
    shipment.status = status;
    shipment.currentLocation = {
      name: location,
      latitude: latitude ? parseFloat(latitude) : shipment.currentLocation?.latitude,
      longitude: longitude ? parseFloat(longitude) : shipment.currentLocation?.longitude
    };

    if (status === 'delivered') {
      shipment.actualArrivalDate = new Date();
      // Unlink containers
      if (shipment.containers && shipment.containers.length > 0) {
        await Container.updateMany(
          { _id: { $in: shipment.containers } },
          { 
            $set: { 
              status: 'at_port', 
              currentLocation: location 
            },
            $set: {
              'history.$[elem].endDate': new Date()
            }
          },
          {
            arrayFilters: [{ 'elem.shipment': shipment._id }]
          }
        );
      }
    }

    // Recheck delay
    const delayCheck = detectDelay(shipment);
    shipment.isDelayed = delayCheck.isDelayed;
    shipment.delayDays = delayCheck.delayDays;
    shipment.delayReason = delayCheck.delayReason;

    await shipment.save();
    await syncSchedule(shipment);

    // Trigger Notification for manual update
    const staffToNotify = await User.find({
      role: { $in: ['admin', 'manager'] },
      deleted: { $ne: true },
      status: 'active'
    });
    for (const staff of staffToNotify) {
      await sendNotification({
        recipientId: staff._id,
        type: 'carrier_update',
        severity: 'info',
        title: `📍 Shipment Update: ${shipment.shipmentNumber}`,
        body: `Manual update: ${description} (Status: ${status})`,
        actionUrl: `/logistics/shipments/${shipment._id}`,
        actionLabel: 'View Shipment Details',
        entityType: 'Shipment',
        entityId: shipment._id,
        entityRef: shipment.shipmentNumber
      });
    }

    res.status(200).json({ success: true, shipment });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] addTrackingEvent error:', error);
    res.status(500).json({ success: false, message: 'Server error adding tracking event' });
  }
};

// 6. Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Counts
    const activeCount = await Shipment.countDocuments({ status: { $nin: ['delivered', 'cancelled'] } });
    const inboundCount = await Shipment.countDocuments({ direction: 'inbound', status: { $nin: ['delivered', 'cancelled'] } });
    const outboundCount = await Shipment.countDocuments({ direction: 'outbound', status: { $nin: ['delivered', 'cancelled'] } });
    const delayedCount = await Shipment.countDocuments({ isDelayed: true, status: { $nin: ['delivered', 'cancelled'] } });
    const totalCount = await Shipment.countDocuments({});

    // 2. Shipping method breakdown
    const methods = ['sea', 'air', 'road', 'rail', 'courier'];
    const methodBreakdown = {};
    for (const m of methods) {
      methodBreakdown[m] = await Shipment.countDocuments({ shippingMethod: m, status: { $nin: ['delivered', 'cancelled'] } });
    }

    // 3. Arriving soon countdowns (next 5 days)
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    const arrivingSoon = await Shipment.find({
      status: { $nin: ['delivered', 'cancelled'] },
      estimatedArrivalDate: { $gte: new Date(), $lte: fiveDaysFromNow }
    })
    .sort({ estimatedArrivalDate: 1 })
    .limit(5);

    // 4. Recent tracking updates/notifications
    const recentNotifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('shipment', 'shipmentNumber status');

    res.status(200).json({
      success: true,
      stats: {
        activeCount,
        inboundCount,
        outboundCount,
        delayedCount,
        totalCount,
        methodBreakdown,
        arrivingSoon,
        recentNotifications
      }
    });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] getDashboardStats error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving dashboard statistics' });
  }
};

// 7. On-demand Carrier Poll Trigger
exports.triggerCarrierPoll = async (req, res) => {
  try {
    await runCarrierPoll();
    res.status(200).json({ success: true, message: 'Active carrier polling completed successfully' });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] triggerCarrierPoll error:', error);
    res.status(500).json({ success: false, message: 'Carrier polling trigger failed' });
  }
};

// 8. Export CSV
exports.exportCSV = async (req, res) => {
  try {
    const shipments = await Shipment.find({})
      .populate('importOrder', 'poNumber')
      .populate('exportOrder', 'orderNumber');
    
    let csvContent = 'Shipment Number,Direction,Carrier,Tracking Number,Method,Status,Origin,Destination,Departure Date,Estimated Arrival,Is Delayed,Delay Days,Reason\n';
    
    shipments.forEach(s => {
      const depDate = s.departureDate ? new Date(s.departureDate).toISOString().split('T')[0] : 'N/A';
      const estDate = s.estimatedArrivalDate ? new Date(s.estimatedArrivalDate).toISOString().split('T')[0] : 'N/A';
      const originName = (s.origin?.name || '').replace(/,/g, ' ');
      const destName = (s.destination?.name || '').replace(/,/g, ' ');
      const delayReasonText = (s.delayReason || '').replace(/,/g, ' ');

      csvContent += `${s.shipmentNumber},${s.direction},${s.carrierName},'${s.trackingNumber}',${s.shippingMethod},${s.status},${originName},${destName},${depDate},${estDate},${s.isDelayed},${s.delayDays},${delayReasonText}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="shipments_export.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] exportCSV error:', error);
    res.status(500).json({ success: false, message: 'Server error generating CSV export' });
  }
};

// 9. Notifications Endpoints
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('shipment', 'shipmentNumber status');
    
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] getNotifications error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving notifications' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] markNotificationRead error:', error);
    res.status(500).json({ success: false, message: 'Server error updating notification status' });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] markAllNotificationsRead error:', error);
    res.status(500).json({ success: false, message: 'Server error resetting notifications' });
  }
};

// 10. Get Shipping Schedule entries (for React Big Calendar)
exports.getShippingSchedule = async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = {};

    if (start || end) {
      const orClauses = [];
      if (start) {
        orClauses.push({ startDate: { $gte: new Date(start) } });
      }
      if (end) {
        orClauses.push({ endDate: { $lte: new Date(end) } });
      }
      if (orClauses.length > 0) {
        query.$or = orClauses;
      }
    }

    const entries = await ShippingScheduleEntry.find(query)
      .populate({
        path: 'shipment',
        select: 'shipmentNumber status direction carrierName origin destination estimatedArrivalDate'
      });

    res.status(200).json({ success: true, entries });
  } catch (error) {
    console.error('[SHIPMENT CONTROLLER] getShippingSchedule error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving shipping schedule' });
  }
};
