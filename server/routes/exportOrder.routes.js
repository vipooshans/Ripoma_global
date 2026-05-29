const express = require('express');
const router = express.Router();
const exportOrderController = require('../controllers/exportOrder.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', exportOrderController.listOrders);
router.post('/', requireRole('admin', 'manager'), exportOrderController.createOrder);

router.get('/dashboard', exportOrderController.getDashboardStats);
router.get('/export', exportOrderController.exportCSV);

router.get('/:id', exportOrderController.getOrder);
router.put('/:id', requireRole('admin', 'manager'), exportOrderController.updateOrder);
router.patch('/:id/confirm', requireRole('admin', 'manager'), exportOrderController.confirmOrder);
router.patch('/:id/status', requireRole('admin', 'manager'), exportOrderController.transitionStatus);
router.patch('/:id/cancel', requireRole('admin', 'manager'), exportOrderController.cancelOrder);
router.post('/:id/timeline-note', exportOrderController.addTimelineNote);

module.exports = router;
