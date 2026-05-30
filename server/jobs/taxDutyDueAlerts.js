const cron = require('node-cron');
const TaxDutyRecord = require('../models/TaxDutyRecord');
const User = require('../models/User');
const { sendNotification } = require('../utils/notifyService');

/**
 * Scans for tax/duty records that are due in the next 30 days and are unpaid,
 * and notifies admins/managers.
 */
const runTaxDutyDueCheck = async () => {
  try {
    console.log('[CRON] Checking for upcoming tax and duty payments due in the next 30 days...');
    
    const today = new Date();
    const future30Days = new Date();
    future30Days.setDate(today.getDate() + 30);

    const upcomingRecords = await TaxDutyRecord.find({
      status: { $ne: 'paid' },
      dueDate: { $gte: today, $lte: future30Days }
    });

    if (upcomingRecords.length === 0) {
      console.log('[CRON] No upcoming tax and duty payments due within 30 days.');
      return;
    }

    const staffToNotify = await User.find({
      role: { $in: ['admin', 'manager'] },
      deleted: { $ne: true },
      status: 'active'
    });

    for (const record of upcomingRecords) {
      const notifyType = record.type === 'tax' ? 'tax_due' : 'duty_due';
      
      for (const staff of staffToNotify) {
        await sendNotification({
          recipientId: staff._id,
          type: notifyType,
          severity: 'warning',
          title: `⚖️ Tax/Duty Due Soon: ${record.recordNumber}`,
          body: `Tax/Duty record ${record.recordNumber} (${record.type.replace('_', ' ')}) for ${record.country} of amount ${record.amount} ${record.currency} is due on ${new Date(record.dueDate).toLocaleDateString()}.`,
          actionUrl: '/finance/taxes',
          actionLabel: 'View Tax/Duty Board',
          entityType: 'TaxDutyRecord',
          entityId: record._id,
          entityRef: record.recordNumber
        });
      }
      console.log(`[CRON ALERT] Tax/Duty record ${record.recordNumber} flagged as due within 30 days (Due: ${new Date(record.dueDate).toLocaleDateString()}).`);
    }

    console.log(`[CRON] Tax/Duty due scan complete. Notified staff for ${upcomingRecords.length} records.`);
  } catch (error) {
    console.error('[CRON ERROR] Upcoming tax/duty sweep failed:', error);
  }
};

/**
 * Initializes the tax and duty alerts cron. Runs daily at 07:15.
 */
const initTaxDutyAlertCron = () => {
  cron.schedule('15 7 * * *', async () => {
    await runTaxDutyDueCheck();
  });
  console.log('[CRON] Tax and duty alerts check job (07:15) initialized.');
};

module.exports = {
  initTaxDutyAlertCron,
  runTaxDutyDueCheck
};
