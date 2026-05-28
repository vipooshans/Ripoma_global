const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.get('/', authMiddleware, supplierController.getSuppliers);
router.post('/', authMiddleware, requirePermission('inventory:write'), supplierController.createSupplier);

module.exports = router;
