const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stockMovement.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.get('/', authMiddleware, stockMovementController.getStockMovements);
router.get('/:id', authMiddleware, stockMovementController.getStockMovementById);
router.post('/', authMiddleware, requirePermission('inventory:write'), stockMovementController.createStockMovement);

module.exports = router;
