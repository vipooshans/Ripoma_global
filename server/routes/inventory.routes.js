const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.get('/', authMiddleware, inventoryController.getAllStockItems);
router.get('/dashboard', authMiddleware, inventoryController.getDashboardKPIs);
router.get('/:productId/:warehouseId', authMiddleware, inventoryController.getStockByProductAndWarehouse);
router.patch('/:productId/:warehouseId', authMiddleware, requirePermission('inventory:write'), inventoryController.updateStockMeta);

module.exports = router;
