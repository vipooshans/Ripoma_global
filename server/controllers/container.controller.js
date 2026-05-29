const Container = require('../models/Container');

// 1. List Containers
exports.getContainers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, type, sort } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { containerNumber: { $regex: search, $options: 'i' } },
        { owner: { $regex: search, $options: 'i' } },
        { sealNumber: { $regex: search, $options: 'i' } },
        { currentLocation: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (type) query.type = type;

    let sortOption = { createdAt: -1 };
    if (sort) {
      const [field, order] = sort.split(':');
      sortOption = { [field]: order === 'desc' ? -1 : 1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const containers = await Container.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('currentShipment', 'shipmentNumber status carrierName');

    const total = await Container.countDocuments(query);

    res.status(200).json({
      success: true,
      containers,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('[CONTAINER CONTROLLER] getContainers error:', error);
    res.status(500).json({ success: false, message: 'Server error listing containers' });
  }
};

// 2. Get Container By ID
exports.getContainerById = async (req, res) => {
  try {
    const container = await Container.findById(req.params.id)
      .populate({
        path: 'currentShipment',
        select: 'shipmentNumber status carrierName departureDate estimatedArrivalDate origin destination'
      })
      .populate({
        path: 'history.shipment',
        select: 'shipmentNumber status actualArrivalDate origin destination'
      });

    if (!container) {
      return res.status(404).json({ success: false, message: 'Container not found' });
    }

    res.status(200).json({ success: true, container });
  } catch (error) {
    console.error('[CONTAINER CONTROLLER] getContainerById error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving container' });
  }
};

// 3. Create Container
exports.createContainer = async (req, res) => {
  try {
    const { containerNumber, type, status, owner, currentLocation, sealNumber, tare, maxPayload, currentPayload, notes } = req.body;

    // Check unique container number
    const existing = await Container.findOne({ containerNumber: containerNumber.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Container number ${containerNumber} already exists` });
    }

    const container = new Container({
      containerNumber: containerNumber.toUpperCase(),
      type,
      status: status || 'available',
      owner,
      currentLocation,
      sealNumber,
      tare,
      maxPayload,
      currentPayload: currentPayload || 0,
      notes
    });

    await container.save();
    res.status(201).json({ success: true, container });
  } catch (error) {
    console.error('[CONTAINER CONTROLLER] createContainer error:', error);
    res.status(500).json({ success: false, message: 'Server error creating container' });
  }
};

// 4. Update Container
exports.updateContainer = async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, message: 'Container not found' });
    }

    // Check unique container number if modified
    if (req.body.containerNumber && req.body.containerNumber.toUpperCase() !== container.containerNumber) {
      const existing = await Container.findOne({ containerNumber: req.body.containerNumber.toUpperCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: `Container number ${req.body.containerNumber} already exists` });
      }
      req.body.containerNumber = req.body.containerNumber.toUpperCase();
    }

    Object.keys(req.body).forEach(key => {
      if (key !== 'history') {
        container[key] = req.body[key];
      }
    });

    await container.save();
    res.status(200).json({ success: true, container });
  } catch (error) {
    console.error('[CONTAINER CONTROLLER] updateContainer error:', error);
    res.status(500).json({ success: false, message: 'Server error updating container' });
  }
};

// 5. Delete Container
exports.deleteContainer = async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);
    if (!container) {
      return res.status(404).json({ success: false, message: 'Container not found' });
    }

    if (container.status !== 'available' && container.status !== 'returned' && container.status !== 'damaged') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete container in active status: ${container.status}. Unlink from shipment first.` 
      });
    }

    await Container.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Container deleted successfully' });
  } catch (error) {
    console.error('[CONTAINER CONTROLLER] deleteContainer error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting container' });
  }
};

// 6. Get Available/Bookable Containers
exports.getAvailableContainers = async (req, res) => {
  try {
    const containers = await Container.find({ status: 'available' }).sort({ containerNumber: 1 });
    res.status(200).json({ success: true, containers });
  } catch (error) {
    console.error('[CONTAINER CONTROLLER] getAvailableContainers error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching available containers' });
  }
};
