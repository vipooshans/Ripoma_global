const express = require('express');
const router = express.Router();
const storefrontOrderAdminController = require('../controllers/storefrontOrderAdmin.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(requireRole('admin', 'manager'));

router.get('/', storefrontOrderAdminController.listOrders);
router.post('/promo-notify', storefrontOrderAdminController.sendPromoNotify);
router.get('/:id', storefrontOrderAdminController.getOrder);
router.patch('/:id/status', storefrontOrderAdminController.updateStatus);
router.post('/:id/cancel-approve', storefrontOrderAdminController.approveCancel);
router.post('/:id/cancel-reject', storefrontOrderAdminController.rejectCancel);

module.exports = router;
