const Product = require('../models/Product');
const InventoryItem = require('../models/InventoryItem');

// GET /api/alerts/low-stock
exports.getLowStockAlerts = async (req, res) => {
  try {
    // Aggregation query to find all active products where total stock across all warehouses <= lowStockThreshold
    const lowStockProducts = await Product.aggregate([
      { $match: { deleted: false, status: 'active' } },
      {
        $lookup: {
          from: 'inventoryitems',
          localField: '_id',
          foreignField: 'product',
          as: 'inventory'
        }
      },
      {
        $addFields: {
          totalOnHand: { $sum: '$inventory.quantityOnHand' }
        }
      },
      {
        $match: {
          $expr: { $lte: ['$totalOnHand', '$lowStockThreshold'] }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
    ]);

    return res.status(200).json(lowStockProducts);
  } catch (error) {
    console.error('Get Low Stock Alerts Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/alerts/expiring
exports.getExpiringAlerts = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + days);

    const expiringItems = await InventoryItem.find({
      expiryDate: { $gte: now, $lte: futureLimit }
    })
      .populate({
        path: 'product',
        match: { deleted: false },
        populate: { path: 'category', select: 'name' }
      })
      .populate('warehouse', 'name code');

    // Filter out items that don't match active product query
    const validExpiringItems = expiringItems.filter(item => item.product !== null);

    return res.status(200).json(validExpiringItems);
  } catch (error) {
    console.error('Get Expiring Alerts Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/alerts/settings
exports.saveAlertSettings = async (req, res) => {
  try {
    const { productId, lowStockThreshold, reorderQuantity } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required.' });
    }

    const product = await Product.findOne({ _id: productId, deleted: false });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (lowStockThreshold !== undefined) {
      product.lowStockThreshold = parseInt(lowStockThreshold) || 0;
    }

    if (reorderQuantity !== undefined) {
      product.reorderQuantity = parseInt(reorderQuantity) || 0;
    }

    await product.save();

    return res.status(200).json({
      message: 'Product alert settings updated successfully.',
      product
    });
  } catch (error) {
    console.error('Save Alert Settings Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
