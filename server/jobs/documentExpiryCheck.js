const cron = require('node-cron');
const Document = require('../models/Document');

/**
 * Runs daily at 07:00 — marks expired documents and logs expiry alerts.
 */
const startDocumentExpiryCheck = () => {
  cron.schedule('0 7 * * *', async () => {
    console.log('[DocExpiryCron] Running document expiry check...');
    try {
      const now = new Date();

      // Mark documents whose expiryDate has passed as expired
      const expiredResult = await Document.updateMany(
        { expiryDate: { $lte: now }, isExpired: false, isDeleted: false },
        { $set: { isExpired: true } }
      );
      if (expiredResult.modifiedCount > 0) {
        console.log(`[DocExpiryCron] Marked ${expiredResult.modifiedCount} document(s) as expired.`);
      }

      // Find documents expiring in the next 30 days that haven't been alerted
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringSoon = await Document.find({
        expiryDate: { $gt: now, $lte: thirtyDaysFromNow },
        expiryAlertSent: false,
        isDeleted: false,
        isExpired: false
      });

      if (expiringSoon.length > 0) {
        // Mark alertSent flag — actual email notification can be plugged in here
        const ids = expiringSoon.map(d => d._id);
        await Document.updateMany({ _id: { $in: ids } }, { $set: { expiryAlertSent: true } });
        console.log(`[DocExpiryCron] Alert flag set for ${expiringSoon.length} document(s) expiring soon.`);
        // TODO: Send email notifications via nodemailer or notification service
      }

      console.log('[DocExpiryCron] Done.');
    } catch (err) {
      console.error('[DocExpiryCron] Error during expiry check:', err);
    }
  }, {
    timezone: 'Asia/Colombo'
  });

  console.log('[DocExpiryCron] Scheduled: daily at 07:00 Asia/Colombo');
};

module.exports = { startDocumentExpiryCheck };
