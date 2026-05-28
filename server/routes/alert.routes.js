const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

router.get('/low-stock', authMiddleware, alertController.getLowStockAlerts);
router.get('/expiring', authMiddleware, alertController.getExpiringAlerts);
router.post('/settings', authMiddleware, requirePermission('inventory:write'), alertController.saveAlertSettings);

module.exports = router;
