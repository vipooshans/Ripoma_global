const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currency.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Base lookups and conversion
router.get('/rates', currencyController.getRates);
router.get('/rates/history', currencyController.getRatesHistory);
router.get('/rates/:date', currencyController.getRatesByDate);
router.post('/convert', currencyController.convertAmount);
router.get('/base', currencyController.getBaseSettings);

// Admin-only config modifications and refreshes
router.post('/rates/refresh', requireRole('admin'), currencyController.refreshRates);
router.post('/base', requireRole('admin'), currencyController.updateBaseSettings);

module.exports = router;
