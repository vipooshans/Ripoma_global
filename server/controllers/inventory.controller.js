const InventoryItem = require('../models/InventoryItem');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const { getStockValue } = require('../utils/stockCalculator');

// GET /api/inventory
exports.getAllStockItems = async (req, res) => {
  try {
    const { warehouse, product, lowStock, expiring } = req.query;

    const query = {};

    if (warehouse) {
      query.warehouse = warehouse;
    }

    if (product) {
      query.product = product;
    }

    // Load active and non-deleted products only
    let items = await InventoryItem.find(query)
      .populate({
        path: 'product',
        match: { deleted: false },
        populate: { path: 'category', select: 'name' }
      })
      .populate('warehouse', 'name code');

    // Filter items to ensure they belong to active, non-deleted products
    items = items.filter(item => item.product !== null);

    // Filter low stock if specified
    if (lowStock === 'true') {
      // Group by product to check global stock or check per warehouse threshold
      // The prompt specifies: "A product is low stock if its total quantityOnHand across ALL warehouses <= product.lowStockThreshold"
      // So we filter items where their product's aggregate stock is low
      const products = await Product.find({ deleted: false, status: 'active' });
      const lowStockIds = [];

      for (const prod of products) {
        const prodItems = await InventoryItem.find({ product: prod._id });
        const aggregateQty = prodItems.reduce((sum, i) => sum + (i.quantityOnHand || 0), 0);
        if (aggregateQty <= prod.lowStockThreshold) {
          lowStockIds.push(prod._id.toString());
        }
      }

      items = items.filter(item => lowStockIds.includes(item.product._id.toString()));
    }

    // Filter expiring soon if specified (expiryDate within 30 days or general date query)
    if (expiring === 'true') {
      const now = new Date();
      const futureLimit = new Date();
      futureLimit.setDate(now.getDate() + 30); // 30 days warning

      items = items.filter(item => {
        if (!item.expiryDate) return false;
        const exp = new Date(item.expiryDate);
        return exp >= now && exp <= futureLimit;
      });
    }

    return res.status(200).json(items);
  } catch (error) {
    console.error('Get All Stock Items Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/inventory/dashboard
exports.getDashboardKPIs = async (req, res) => {
  try {
    // 1. Total SKUs (active, non-deleted products)
    const totalSKUs = await Product.countDocuments({ deleted: false, status: 'active' });

    // 2. Warehouses (active)
    const warehouseCount = await Warehouse.countDocuments({ status: 'active' });

    // 3. Total Stock Units
    const items = await InventoryItem.find()
      .populate({
        path: 'product',
        match: { deleted: false, status: 'active' }
      });
    // Filter to count only valid active products
    const validItems = items.filter(item => item.product !== null);
    const totalUnits = validItems.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);

    // 4. Stock Value (USD)
    const stockValue = await getStockValue();

    // 5. Low Stock Count (global logic)
    const products = await Product.find({ deleted: false, status: 'active' });
    let lowStockCount = 0;

    for (const prod of products) {
      const prodItems = await InventoryItem.find({ product: prod._id });
      const aggregateQty = prodItems.reduce((sum, i) => sum + (i.quantityOnHand || 0), 0);
      if (aggregateQty <= prod.lowStockThreshold) {
        lowStockCount++;
      }
    }

    return res.status(200).json({
      totalSKUs,
      totalUnits,
      stockValue,
      warehouseCount,
      lowStockCount
    });
  } catch (error) {
    console.error('Get Dashboard KPIs Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/inventory/:productId/:warehouseId
exports.getStockByProductAndWarehouse = async (req, res) => {
  try {
    const { productId, warehouseId } = req.params;
    
    let item = await InventoryItem.findOne({ product: productId, warehouse: warehouseId })
      .populate('product', 'name sku unit unitCost sellingPrice')
      .populate('warehouse', 'name code');

    if (!item) {
      // Return a default empty stock structure if not created yet
      return res.status(200).json({
        product: productId,
        warehouse: warehouseId,
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
        location: '',
        batchNumber: ''
      });
    }

    return res.status(200).json(item);
  } catch (error) {
    console.error('Get Product Warehouse Stock Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/inventory/:productId/:warehouseId
exports.updateStockMeta = async (req, res) => {
  try {
    const { productId, warehouseId } = req.params;
    const { location, batchNumber, expiryDate } = req.body;

    let item = await InventoryItem.findOne({ product: productId, warehouse: warehouseId });
    
    if (!item) {
      // Create a new stock item with 0 quantity if it doesn't exist
      item = new InventoryItem({
        product: productId,
        warehouse: warehouseId,
        quantityOnHand: 0,
        quantityReserved: 0
      });
    }

    item.location = location !== undefined ? location.trim() : item.location;
    item.batchNumber = batchNumber !== undefined ? batchNumber.trim() : item.batchNumber;
    item.expiryDate = expiryDate !== undefined ? expiryDate : item.expiryDate;

    await item.save();
    return res.status(200).json({ message: 'Stock metadata updated successfully.', item });
  } catch (error) {
    console.error('Update Stock Metadata Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
