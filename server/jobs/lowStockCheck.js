const cron = require('node-cron');
const Product = require('../models/Product');
const User = require('../models/User');
const { getTotalStockForProduct } = require('../utils/stockCalculator');
const { sendNotification } = require('../utils/notifyService');

/**
 * Audit low stock thresholds across all active products.
 */
const runLowStockCheck = async () => {
  try {
    console.log('[CRON] Executing hourly low-stock threshold audit...');
    const products = await Product.find({ deleted: false, status: 'active' });
    const staffToNotify = await User.find({
      role: { $in: ['admin', 'manager'] },
      deleted: { $ne: true },
      status: 'active'
    });

    let warningCount = 0;

    for (const product of products) {
      const { quantityOnHand } = await getTotalStockForProduct(product._id);
      if (quantityOnHand <= product.lowStockThreshold) {
        warningCount++;
        const type = quantityOnHand <= 0 ? 'out_of_stock' : 'low_stock';
        for (const staff of staffToNotify) {
          await sendNotification({
            recipientId: staff._id,
            type,
            severity: quantityOnHand <= 0 ? 'error' : 'warning',
            title: `Low stock: ${product.sku}`,
            body: `${product.name} has ${quantityOnHand} on hand (threshold ${product.lowStockThreshold}).`,
            actionUrl: `/inventory/products/${product._id}`,
            actionLabel: 'View Product',
            entityType: 'Product',
            entityId: product._id,
            entityRef: product.sku
          });
        }
      }
    }
    console.log(`[CRON] Low stock check complete. Detected ${warningCount} warnings.`);
  } catch (error) {
    console.error('[CRON ERROR] Failed to run low-stock audit:', error);
  }
};

const initLowStockCron = () => {
  cron.schedule('0 * * * *', runLowStockCheck);
  console.log('[CRON] Low stock hourly monitor worker initialized.');
};

module.exports = {
  initLowStockCron,
  runLowStockCheck
};
