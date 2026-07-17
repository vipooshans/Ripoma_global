const cron = require('node-cron');
const Document = require('../models/Document');
const User = require('../models/User');
const { sendNotification } = require('../utils/notifyService');

/**
 * Runs daily at 07:00 — marks expired documents and sends expiry alerts.
 */
const startDocumentExpiryCheck = () => {
  cron.schedule('0 7 * * *', async () => {
    console.log('[DocExpiryCron] Running document expiry check...');
    try {
      const now = new Date();

      const expiredResult = await Document.updateMany(
        { expiryDate: { $lte: now }, isExpired: false, isDeleted: false },
        { $set: { isExpired: true } }
      );
      if (expiredResult.modifiedCount > 0) {
        console.log(`[DocExpiryCron] Marked ${expiredResult.modifiedCount} document(s) as expired.`);
      }

      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringSoon = await Document.find({
        expiryDate: { $gt: now, $lte: thirtyDaysFromNow },
        expiryAlertSent: false,
        isDeleted: false,
        isExpired: false
      });

      if (expiringSoon.length > 0) {
        const staffToNotify = await User.find({
          role: { $in: ['admin', 'manager'] },
          deleted: { $ne: true },
          status: 'active'
        });

        for (const doc of expiringSoon) {
          for (const staff of staffToNotify) {
            await sendNotification({
              recipientId: staff._id,
              type: 'document_expiring',
              severity: 'warning',
              title: `Document expiring: ${doc.name}`,
              body: `"${doc.name}" expires on ${new Date(doc.expiryDate).toLocaleDateString()}.`,
              actionUrl: `/documents/${doc._id}`,
              actionLabel: 'View Document',
              entityType: 'Document',
              entityId: doc._id,
              entityRef: doc.name
            });
          }
        }

        const ids = expiringSoon.map(d => d._id);
        await Document.updateMany({ _id: { $in: ids } }, { $set: { expiryAlertSent: true } });
        console.log(`[DocExpiryCron] Alerted for ${expiringSoon.length} document(s) expiring soon.`);
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
