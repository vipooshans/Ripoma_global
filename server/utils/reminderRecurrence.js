/**
 * Computes the next due date for a recurring reminder.
 * 
 * @param {object} reminder - Reminder document
 * @returns {Date|null} Next due date, or null if recurrence is disabled or has ended
 */
const computeNextDueAt = (reminder) => {
  if (!reminder.recurrence || !reminder.recurrence.enabled) {
    return null;
  }

  const currentDue = new Date(reminder.dueAt);
  const frequency = reminder.recurrence.frequency;
  const endDate = reminder.recurrence.endDate ? new Date(reminder.recurrence.endDate) : null;

  let nextDue = new Date(currentDue);

  switch (frequency) {
    case 'daily':
      nextDue.setDate(currentDue.getDate() + 1);
      break;
    case 'weekly':
      nextDue.setDate(currentDue.getDate() + 7);
      break;
    case 'monthly':
      nextDue.setMonth(currentDue.getMonth() + 1);
      break;
    default:
      return null;
  }

  // If there is an end date and the next due date exceeds it, end the recurrence
  if (endDate && nextDue > endDate) {
    return null;
  }

  return nextDue;
};

module.exports = { computeNextDueAt };
