const cron = require('node-cron');
const Product = require('../models/Product');
const { getTotalStockForProduct } = require('../utils/stockCalculator');

/**
 * Audit low stock thresholds across all active products.
 */
const runLowStockCheck = async () => {
  try {
    console.log('[CRON] Executing hourly low-stock threshold audit...');
    const products = await Product.find({ deleted: false, status: 'active' });
    let warningCount = 0;

    for (const product of products) {
      const { quantityOnHand } = await getTotalStockForProduct(product._id);
      if (quantityOnHand <= product.lowStockThreshold) {
        console.warn(
          `[CRON ALERT] Low stock warning for product: ${product.name} (SKU: ${product.sku}). ` +
          `Current Stock: ${quantityOnHand}, Threshold: ${product.lowStockThreshold}`
        );
        warningCount++;
        // In production, you would trigger SMS, Slack, or Email dispatch to warehouse managers here.
      }
    }
    console.log(`[CRON] Low stock check complete. Detected ${warningCount} warnings.`);
  } catch (error) {
    console.error('[CRON ERROR] Failed to run low-stock audit:', error);
  }
};

/**
 * Initializes the node-cron scheduler.
 * Runs at minute 0 of every hour (0 * * * *).
 */
const initLowStockCron = () => {
  cron.schedule('0 * * * *', runLowStockCheck);
  console.log('[CRON] Low stock hourly monitor worker initialized.');
};

module.exports = {
  initLowStockCron,
  runLowStockCheck
};
