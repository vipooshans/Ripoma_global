const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Base queries require finance:read
router.get('/', requirePermission('finance:read'), paymentController.listPayments);
router.get('/dashboard', requirePermission('finance:read'), paymentController.getDashboardKPIs);
router.get('/overdue', requirePermission('finance:read'), paymentController.getOverduePayments);
router.get('/export', requirePermission('finance:read'), paymentController.exportPaymentsCSV);

// Details
router.get('/:id', requirePermission('finance:read'), paymentController.getPayment);

// Writes require finance:write
router.post('/', requirePermission('finance:write'), paymentController.createPayment);
router.put('/:id', requirePermission('finance:write'), paymentController.updatePayment);
router.patch('/:id/status', requirePermission('finance:write'), paymentController.updateStatus);

module.exports = router;
