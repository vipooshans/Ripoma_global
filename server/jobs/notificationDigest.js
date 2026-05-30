const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const NotificationPreference = require('../models/NotificationPreference');
const NotificationDigestQueue = require('../models/NotificationDigestQueue');

const calculateNextDailyDigest = (digestTime) => {
  const now = new Date();
  const [h, m] = digestTime.split(':').map(Number);
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (date <= now) {
    date.setDate(date.getDate() + 1);
  }
  return date;
};

const calculateNextWeeklyDigest = (digestTime, dayOfWeek) => {
  const now = new Date();
  const [h, m] = digestTime.split(':').map(Number);
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  
  const currentDay = date.getDay();
  let diff = dayOfWeek - currentDay;
  if (diff < 0) {
    diff += 7;
  } else if (diff === 0 && date <= now) {
    diff = 7;
  }
  
  date.setDate(date.getDate() + diff);
  return date;
};

const getTransporter = () => {
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    return nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const runNotificationDigest = async () => {
  try {
    const now = new Date();
    
    // Find all preferences whose next digest run time has passed
    const preferences = await NotificationPreference.find({
      emailDigest: { $in: ['daily', 'weekly'] },
      nextDigestAt: { $lte: now }
    }).populate('user');

    if (preferences.length === 0) {
      return;
    }

    console.log(`[CRON] Found ${preferences.length} users with pending email digest runs...`);

    const transporter = getTransporter();

    for (const pref of preferences) {
      if (!pref.user) {
        // user no longer exists, skip
        continue;
      }

      // 1. Fetch all unsent queued digest items for this user
      const queueItems = await NotificationDigestQueue.find({
        user: pref.user._id,
        sent: false
      }).populate('notification');

      if (queueItems.length > 0) {
        try {
          // Sort items by severity: error first, then warning, then success, then info
          const severityOrder = { error: 0, warning: 1, success: 2, info: 3 };
          queueItems.sort((a, b) => {
            const sevA = a.notification?.severity || 'info';
            const sevB = b.notification?.severity || 'info';
            return (severityOrder[sevA] ?? 3) - (severityOrder[sevB] ?? 3);
          });

          // Compile html list
          let itemsHtml = '';
          let lastSeverity = '';
          
          for (const item of queueItems) {
            const notif = item.notification;
            if (!notif) continue;

            if (notif.severity !== lastSeverity) {
              lastSeverity = notif.severity;
              itemsHtml += `<div class="section-title">${lastSeverity} notifications</div>`;
            }

            const timeStr = new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(notif.createdAt).toLocaleDateString();

            itemsHtml += `
              <div class="notification-item">
                <div class="item-header">
                  <h4 class="item-title">${notif.title}</h4>
                  <span class="item-time">${dateStr} at ${timeStr}</span>
                </div>
                <p class="item-body">${notif.body || ''}</p>
                ${notif.actionUrl && notif.actionLabel 
                  ? `<a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}${notif.actionUrl}" class="item-link" style="color: #0D9488 !important; text-decoration: none; font-weight: bold;">${notif.actionLabel} &rarr;</a>` 
                  : ''
                }
              </div>
            `;
          }

          // 2. Read template and compile digest email
          const templatePath = path.join(__dirname, '..', 'utils', 'emailTemplates', 'digest.html');
          let html = fs.readFileSync(templatePath, 'utf8');
          html = html.replace(/{{user}}/g, pref.user.name);
          html = html.replace(/{{digestItems}}/g, itemsHtml);

          // 3. Send email digest
          const mailOptions = {
            from: process.env.EMAIL_FROM || 'notifications@ripomaglobal.com',
            to: pref.user.email,
            subject: `RIPOMA GLOBAL — Daily/Weekly Activity Summary`,
            html
          };

          await transporter.sendMail(mailOptions);

          // 4. Mark items as sent in queue
          const queueIds = queueItems.map(qi => qi._id);
          await NotificationDigestQueue.updateMany(
            { _id: { $in: queueIds } },
            { $set: { sent: true, sentAt: new Date() } }
          );

          console.log(`[CRON DIGEST] Digest email sent successfully to user ${pref.user.email}`);
        } catch (sendErr) {
          console.error(`[CRON DIGEST ERROR] Failed to compile or send digest to user ${pref.user.email}:`, sendErr);
        }
      }

      // 5. Update next run time
      if (pref.emailDigest === 'daily') {
        pref.nextDigestAt = calculateNextDailyDigest(pref.digestTime);
      } else if (pref.emailDigest === 'weekly') {
        pref.nextDigestAt = calculateNextWeeklyDigest(pref.digestTime, pref.digestDayOfWeek);
      }
      await pref.save();
    }
  } catch (error) {
    console.error('[CRON ERROR] Notification digest check failed:', error);
  }
};

/**
 * Initializes the digest check job to run every 30 minutes.
 */
const initScheduledDigestCron = () => {
  cron.schedule('*/30 * * * *', async () => {
    await runNotificationDigest();
  });
  console.log('[CRON] Notification email digest check job (every 30 min) initialized.');
};

module.exports = {
  initScheduledDigestCron,
  runNotificationDigest,
  calculateNextDailyDigest,
  calculateNextWeeklyDigest
};
