const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoice.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', invoiceController.listInvoices);
router.post('/', requireRole('admin', 'manager'), invoiceController.createInvoice);

router.get('/:id', invoiceController.getInvoice);
router.patch('/:id/send', requireRole('admin', 'manager'), invoiceController.sendInvoice);
router.patch('/:id/pay', requireRole('admin', 'manager'), invoiceController.payInvoice);
router.get('/:id/pdf', invoiceController.getInvoicePdf);

module.exports = router;
