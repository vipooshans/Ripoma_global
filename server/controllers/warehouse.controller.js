const Warehouse = require('../models/Warehouse');
const InventoryItem = require('../models/InventoryItem');
const User = require('../models/User');

// GET /api/warehouses
exports.getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find().populate('manager', 'name email');
    
    // Compute capacity used and item count for each warehouse
    const enrichedWarehouses = await Promise.all(
      warehouses.map(async (w) => {
        const items = await InventoryItem.find({ warehouse: w._id });
        const stockItemCount = items.length;
        const totalQtyOnHand = items.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);
        
        return {
          ...w.toObject(),
          stockItemCount,
          capacityUsed: totalQtyOnHand,
          capacityPercentage: w.capacity > 0 ? parseFloat(((totalQtyOnHand / w.capacity) * 100).toFixed(2)) : 0
        };
      })
    );

    return res.status(200).json(enrichedWarehouses);
  } catch (error) {
    console.error('Get Warehouses Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/warehouses/:id
exports.getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await Warehouse.findById(id).populate('manager', 'name email');
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found.' });
    }

    // Fetch stock items in this warehouse
    const items = await InventoryItem.find({ warehouse: id })
      .populate({
        path: 'product',
        match: { deleted: false }, // only non-deleted products
        populate: { path: 'category', select: 'name' }
      });

    // Filter out items where populated product is null (deleted products)
    const validItems = items.filter(item => item.product !== null);

    const totalQtyOnHand = validItems.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);

    return res.status(200).json({
      warehouse: {
        ...warehouse.toObject(),
        capacityUsed: totalQtyOnHand,
        capacityPercentage: warehouse.capacity > 0 ? parseFloat(((totalQtyOnHand / warehouse.capacity) * 100).toFixed(2)) : 0
      },
      stockItems: validItems
    });
  } catch (error) {
    console.error('Get Warehouse Detail Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/warehouses (Admin only)
exports.createWarehouse = async (req, res) => {
  try {
    const { name, code, address, manager, capacity, status } = req.body;

    if (!name || !code) {
      return res.status(400).json({ message: 'Warehouse name and code are required.' });
    }

    // Check unique code
    const existing = await Warehouse.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'Warehouse with this code already exists.' });
    }

    const warehouse = new Warehouse({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      address,
      manager: manager || null,
      capacity: capacity || 10000,
      status: status || 'active'
    });

    await warehouse.save();
    return res.status(201).json({ message: 'Warehouse created successfully.', warehouse });
  } catch (error) {
    console.error('Create Warehouse Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PUT /api/warehouses/:id (Admin only)
exports.updateWarehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, manager, capacity, status } = req.body;

    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found.' });
    }

    if (code) {
      const cleanCode = code.toUpperCase().trim();
      if (cleanCode !== warehouse.code) {
        const existing = await Warehouse.findOne({ code: cleanCode });
        if (existing) {
          return res.status(400).json({ message: 'Warehouse with this code already exists.' });
        }
        warehouse.code = cleanCode;
      }
    }

    warehouse.name = name !== undefined ? name.trim() : warehouse.name;
    warehouse.address = address !== undefined ? address : warehouse.address;
    warehouse.manager = manager !== undefined ? manager : warehouse.manager;
    warehouse.capacity = capacity !== undefined ? capacity : warehouse.capacity;
    warehouse.status = status !== undefined ? status : warehouse.status;

    await warehouse.save();
    return res.status(200).json({ message: 'Warehouse updated successfully.', warehouse });
  } catch (error) {
    console.error('Update Warehouse Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
