const express = require('express');
const router = express.Router();
const storefrontSupportAdminController = require('../controllers/storefrontSupportAdmin.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(requireRole('admin', 'manager'));

router.get('/', storefrontSupportAdminController.listTickets);
router.get('/:id', storefrontSupportAdminController.getTicket);
router.post('/:id/reply', storefrontSupportAdminController.reply);
router.patch('/:id/status', storefrontSupportAdminController.updateStatus);

module.exports = router;
