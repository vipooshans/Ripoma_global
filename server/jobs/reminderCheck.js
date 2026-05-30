const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const { sendNotification } = require('../utils/notifyService');
const { computeNextDueAt } = require('../utils/reminderRecurrence');

/**
 * Sweeps the database for due reminders and fires system alerts.
 */
const runReminderCheck = async () => {
  try {
    const now = new Date();

    // Query pending reminders past their due date, or snoozed reminders past their snooze time
    const dueReminders = await Reminder.find({
      $or: [
        { status: 'pending', dueAt: { $lte: now }, notifiedAt: null },
        { status: 'snoozed', snoozeUntil: { $lte: now } }
      ]
    });

    if (dueReminders.length === 0) {
      return;
    }

    console.log(`[CRON] Found ${dueReminders.length} due reminders to process...`);

    for (const reminder of dueReminders) {
      // 1. Dispatch notify events to each assigned user
      for (const recipientId of reminder.assignedTo) {
        try {
          await sendNotification({
            recipientId,
            type: 'reminder',
            severity: 'info',
            title: `⏰ Reminder: ${reminder.title}`,
            body: reminder.body || 'No description provided.',
            actionUrl: '/notifications/reminders',
            actionLabel: 'View Reminders Board',
            entityType: reminder.entityType || 'Reminder',
            entityId: reminder.entityId || reminder._id,
            entityRef: reminder.entityRef
          });
        } catch (notifyErr) {
          console.error(`[CRON ERROR] Failed to send reminder notify to user ${recipientId}:`, notifyErr);
        }
      }

      // 2. Set notified flag and evaluate recurrence parameters
      reminder.notifiedAt = now;

      if (reminder.recurrence && reminder.recurrence.enabled) {
        const nextDue = computeNextDueAt(reminder);
        if (nextDue) {
          reminder.dueAt = nextDue;
          reminder.status = 'pending';
          reminder.notifiedAt = null; // Reset for next iteration
          reminder.snoozeUntil = null;
          console.log(`[CRON] Scheduled recurring reminder "${reminder.title}" next run time: ${nextDue}`);
        } else {
          reminder.status = 'done'; // End of recurrence period
        }
      } else {
        reminder.status = 'done'; // Complete standard reminder
      }

      await reminder.save();
    }
  } catch (error) {
    console.error('[CRON ERROR] Reminder check sweep failed:', error);
  }
};

/**
 * Initializes the reminder cron job. Runs every 5 minutes.
 */
const initScheduledReminderCron = () => {
  cron.schedule('*/5 * * * *', async () => {
    await runReminderCheck();
  });
  console.log('[CRON] Reminder due checker job (every 5 min) initialized.');
};

module.exports = {
  initScheduledReminderCron,
  runReminderCheck
};
