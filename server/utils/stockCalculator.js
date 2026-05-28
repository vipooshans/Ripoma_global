const InventoryItem = require('../models/InventoryItem');
const Product = require('../models/Product');

/**
 * Calculates aggregate stock statistics for a product across all warehouses.
 * @param {string|ObjectId} productId
 * @returns {Promise<{quantityOnHand: number, quantityReserved: number, quantityAvailable: number}>}
 */
const getTotalStockForProduct = async (productId) => {
  const items = await InventoryItem.find({ product: productId });
  
  const quantityOnHand = items.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);
  const quantityReserved = items.reduce((sum, item) => sum + (item.quantityReserved || 0), 0);
  const quantityAvailable = quantityOnHand - quantityReserved;

  return {
    quantityOnHand,
    quantityReserved,
    quantityAvailable
  };
};

/**
 * Calculates total inventory stock valuation (SUM of onHand * unitCost) for all active products.
 * @returns {Promise<number>}
 */
const getStockValue = async () => {
  // Only include active and non-deleted products
  const activeProducts = await Product.find({ status: 'active', deleted: false });
  let totalValue = 0;

  for (const product of activeProducts) {
    const items = await InventoryItem.find({ product: product._id });
    const totalQty = items.reduce((sum, item) => sum + (item.quantityOnHand || 0), 0);
    totalValue += totalQty * (product.unitCost || 0);
  }

  return totalValue;
};

module.exports = {
  getTotalStockForProduct,
  getStockValue
};
