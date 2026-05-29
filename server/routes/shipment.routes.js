const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipment.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/dashboard', shipmentController.getDashboardStats);
router.get('/schedule', shipmentController.getShippingSchedule);
router.get('/notifications', shipmentController.getNotifications);
router.patch('/notifications/read-all', shipmentController.markAllNotificationsRead);
router.patch('/notifications/:id/read', shipmentController.markNotificationRead);
router.get('/csv', shipmentController.exportCSV);
router.post('/poll', shipmentController.triggerCarrierPoll);

router.get('/', shipmentController.getShipments);
router.post('/', requireRole('admin', 'manager'), shipmentController.createShipment);

router.get('/:id', shipmentController.getShipmentById);
router.patch('/:id', requireRole('admin', 'manager'), shipmentController.updateShipment);
router.post('/:id/events', shipmentController.addTrackingEvent);

module.exports = router;
