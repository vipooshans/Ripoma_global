const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, notificationController.getNotifications);
router.get('/unread/count', authMiddleware, notificationController.getUnreadCount);
router.put('/:id/read', authMiddleware, notificationController.markRead);
router.put('/read-all', authMiddleware, notificationController.markAllRead);
router.put('/:id/dismiss', authMiddleware, notificationController.dismissNotification);

module.exports = router;
