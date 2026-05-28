const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouse.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, warehouseController.getWarehouses);
router.get('/:id', authMiddleware, warehouseController.getWarehouseById);
router.post('/', authMiddleware, requireRole(['admin']), warehouseController.createWarehouse);
router.put('/:id', authMiddleware, requireRole(['admin']), warehouseController.updateWarehouse);

module.exports = router;
