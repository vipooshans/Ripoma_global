const express = require('express');
const router = express.Router();
const importOrderController = require('../controllers/importOrder.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', importOrderController.listOrders);
router.post('/', requireRole('admin', 'manager'), importOrderController.createOrder);

router.get('/dashboard', importOrderController.getDashboard);
router.get('/pending-approvals', importOrderController.getPendingApprovals);
router.get('/delivery-schedule', importOrderController.getDeliverySchedule);
router.get('/export', importOrderController.exportCSV);

router.get('/:id', importOrderController.getOrderDetail);
router.get('/:id/timeline', importOrderController.getOrderTimeline);
router.put('/:id', requireRole('admin', 'manager'), importOrderController.updateOrder);
router.delete('/:id', requireRole('admin', 'manager'), importOrderController.cancelOrder);

router.patch('/:id/submit', importOrderController.submitForApproval);
router.patch('/:id/approve', requireRole('admin', 'manager'), importOrderController.approveOrder);
router.patch('/:id/reject', requireRole('admin', 'manager'), importOrderController.rejectOrder);
router.patch('/:id/mark-ordered', requireRole('admin', 'manager'), importOrderController.markOrdered);
router.patch('/:id/mark-in-transit', requireRole('admin', 'manager'), importOrderController.markInTransit);

module.exports = router;
