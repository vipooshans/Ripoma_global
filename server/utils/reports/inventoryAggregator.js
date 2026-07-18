const InventoryItem = require('../../models/InventoryItem');
const Product = require('../../models/Product');

/**
 * Live inventory report from warehouse stock records.
 */
exports.aggregateInventory = async ({ warehouse, lowStockOnly } = {}) => {
  const filter = {};
  if (warehouse) filter.warehouse = warehouse;

  const items = await InventoryItem.find(filter)
    .populate('product', 'sku name unit unitCost sellingPrice lowStockThreshold status deleted')
    .populate('warehouse', 'name code')
    .lean();

  const rows = items
    .filter((item) => item.product && !item.product.deleted)
    .map((item) => {
      const threshold = item.product.lowStockThreshold ?? 10;
      const onHand = item.quantityOnHand || 0;
      const reserved = item.quantityReserved || 0;
      const available = onHand - reserved;
      const isLow = onHand <= threshold;
      return {
        productId: item.product._id,
        sku: item.product.sku,
        name: item.product.name,
        unit: item.product.unit,
        status: item.product.status,
        warehouseId: item.warehouse?._id,
        warehouse: item.warehouse?.name || '—',
        warehouseCode: item.warehouse?.code || '',
        quantityOnHand: onHand,
        quantityReserved: reserved,
        quantityAvailable: available,
        lowStockThreshold: threshold,
        isLowStock: isLow,
        unitCost: item.product.unitCost || 0,
        stockValue: onHand * (item.product.unitCost || 0),
        batchNumber: item.batchNumber || '',
        expiryDate: item.expiryDate || null
      };
    })
    .filter((row) => (lowStockOnly ? row.isLowStock : true));

  const totalOnHand = rows.reduce((s, r) => s + r.quantityOnHand, 0);
  const totalValue = rows.reduce((s, r) => s + r.stockValue, 0);
  const lowStockCount = rows.filter((r) => r.isLowStock).length;

  return {
    summary: {
      lineCount: rows.length,
      totalOnHand,
      totalValue: Math.round(totalValue * 100) / 100,
      lowStockCount
    },
    rows
  };
};
