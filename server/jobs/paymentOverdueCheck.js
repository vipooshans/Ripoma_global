const cron = require('node-cron');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { sendNotification } = require('../utils/notifyService');

/**
 * Sweeps the database for pending payments past their due dates,
 * marks them as overdue, and raises notification alerts.
 */
const runPaymentOverdueCheck = async () => {
  try {
    console.log('[CRON] Sweeping for overdue payments...');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const overduePayments = await Payment.find({
      status: 'pending',
      isOverdue: false,
      dueDate: { $lt: today }
    });

    let updatedCount = 0;
    const staffToNotify = await User.find({
      role: { $in: ['admin', 'manager'] },
      deleted: { $ne: true },
      status: 'active'
    });

    for (const payment of overduePayments) {
      payment.isOverdue = true;
      await payment.save();

      // Create notifications for all admins and managers using notifyService
      for (const staff of staffToNotify) {
        await sendNotification({
          recipientId: staff._id,
          type: 'payment_overdue',
          severity: 'error',
          title: `💸 Overdue Payment: ${payment.paymentNumber}`,
          body: `Payment ${payment.paymentNumber} of ${payment.amount} ${payment.currency} (Counterparty: ${payment.counterpartyName}) is overdue. Due date was ${new Date(payment.dueDate).toLocaleDateString()}.`,
          actionUrl: `/finance/payments/${payment._id}`,
          actionLabel: 'View Payment Details',
          entityType: 'Payment',
          entityId: payment._id,
          entityRef: payment.paymentNumber
        });
      }
      updatedCount++;
      console.warn(`[CRON ALERT] Payment ${payment.paymentNumber} is flagged OVERDUE.`);
    }

    console.log(`[CRON] Overdue payments sweep complete. Flagged ${updatedCount} payments.`);
  } catch (error) {
    console.error('[CRON ERROR] Overdue payments sweep failed:', error);
  }
};

/**
 * Initializes the overdue check job. Runs daily at 07:00.
 */
const initPaymentOverdueCron = () => {
  cron.schedule('0 7 * * *', async () => {
    await runPaymentOverdueCheck();
  });
  console.log('[CRON] Overdue payment check job (07:00) initialized.');
};

module.exports = {
  initPaymentOverdueCron,
  runPaymentOverdueCheck
};
