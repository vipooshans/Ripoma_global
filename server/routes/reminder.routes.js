const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminder.controller');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, reminderController.getReminders);
router.post('/', authMiddleware, reminderController.createReminder);
router.put('/:id', authMiddleware, reminderController.updateReminder);
router.put('/:id/complete', authMiddleware, reminderController.completeReminder);
router.put('/:id/snooze', authMiddleware, reminderController.snoozeReminder);
router.delete('/:id', authMiddleware, reminderController.deleteReminder);

module.exports = router;
