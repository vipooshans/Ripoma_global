const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/kpis', authMiddleware, dashboardController.getKpis);
router.get('/alerts', authMiddleware, dashboardController.getAlerts);
router.get('/chart-data', authMiddleware, dashboardController.getChartData);
router.get('/needs-attention', authMiddleware, dashboardController.getNeedsAttention);

module.exports = router;
