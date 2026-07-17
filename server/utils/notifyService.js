const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const NotificationDigestQueue = require('../models/NotificationDigestQueue');
const User = require('../models/User');

let ioInstance = null;

/**
 * Initializes the notification service with the Socket.IO server instance.
 * @param {object} io - Socket.IO server instance
 */
const init = (io) => {
  ioInstance = io;
  console.log('[NOTIFY SERVICE] Real-time Socket.IO emitter initialized.');
};

/**
 * Checks if the current server time falls inside the user's quiet hours window.
 */
const isInsideQuietHours = (startStr, endStr) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes > endMinutes) {
    // Midnight overlap (e.g. 22:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  } else {
    // Standard window (e.g. 09:00 to 17:00)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
};

/**
 * Returns a configured nodemailer transporter.
 */
const getTransporter = () => {
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') {
    // JSON Transport for local debugging / Ethereal fallback mock
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

/**
 * Compiles a notification email using the HTML template.
 */
const compileEmailTemplate = (title, body, severity, actionUrl, actionLabel) => {
  const filePath = path.join(__dirname, 'emailTemplates', 'notification.html');
  let html = fs.readFileSync(filePath, 'utf8');

  // Replace content tags
  html = html.replace(/{{title}}/g, title);
  html = html.replace(/{{body}}/g, body || '');
  html = html.replace(/{{severity}}/g, severity || 'info');

  const actionBtnHtml = (actionUrl && actionLabel)
    ? `<div style="margin-top: 24px;"><a href="${actionUrl}" class="action-btn" style="color: #FFFFFF !important;">${actionLabel}</a></div>`
    : '';
  html = html.replace(/{{actionButton}}/g, actionBtnHtml);

  return html;
};

/**
 * Dispatches a unified notification to a recipient across available channels.
 * 
 * @param {object} payload
 * @param {string} payload.recipientId - Recipient user database ID
 * @param {string} payload.type - Type code enum
 * @param {string} [payload.severity] - severity string
 * @param {string} payload.title - Notification title
 * @param {string} [payload.body] - Notification body description
 * @param {string} [payload.actionUrl] - click link URL
 * @param {string} [payload.actionLabel] - button action label text
 * @param {string} [payload.entityType] - Source entity type
 * @param {string} [payload.entityId] - Source entity mongoId
 * @param {string} [payload.entityRef] - Reference label (e.g. PO-123)
 * @returns {Promise<object>} Created Notification document
 */
const sendNotification = async ({
  recipientId,
  type,
  severity = 'info',
  title,
  body,
  actionUrl,
  actionLabel,
  entityType,
  entityId,
  entityRef
}) => {
  try {
    // 1. Resolve recipient
    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      console.warn(`[NOTIFY WARN] Recipient user not found: ${recipientId}`);
      return null;
    }

    // 2. Fetch or create preferences
    let pref = await NotificationPreference.findOne({ user: recipientId });
    if (!pref) {
      pref = await NotificationPreference.create({ user: recipientId });
    }

    // 2b. Dedup: skip if unread alert already exists for same recipient/type/entity
    if (entityId) {
      const existing = await Notification.findOne({
        recipient: recipientId,
        type,
        entityId,
        isRead: false
      }).sort({ createdAt: -1 });
      if (existing) {
        console.log(`[NOTIFY DEDUP] Skipped duplicate ${type} for user ${recipientId} entity ${entityId}`);
        return existing;
      }
    }

    // 3. Evaluate quiet hours window (exceptions for critical error severities)
    if (pref.quietHoursEnabled && severity !== 'error') {
      const isQuiet = isInsideQuietHours(pref.quietHoursStart, pref.quietHoursEnd);
      if (isQuiet) {
        console.warn(`[NOTIFY QUIET] Notification "${title}" skipped for user ${recipientUser.name} during quiet hours.`);
        return null;
      }
    }

    // 4. Resolve channel toggles
    let inAppAllowed = pref.inAppEnabled;
    let emailAllowed = pref.emailEnabled;

    if (pref.typeOverrides && pref.typeOverrides.has(type)) {
      const override = pref.typeOverrides.get(type);
      if (override.inApp !== undefined) inAppAllowed = override.inApp;
      if (override.email !== undefined) emailAllowed = override.email;
    }

    // 5. Create Notification log document
    const notification = new Notification({
      recipient: recipientId,
      type,
      severity,
      title,
      body,
      actionUrl,
      actionLabel,
      entityType,
      entityId,
      entityRef,
      channels: {
        inApp: { sent: inAppAllowed, sentAt: inAppAllowed ? new Date() : undefined },
        email: { sent: false }
      }
    });

    await notification.save();

    // 6. Push real-time event to client room
    if (inAppAllowed && ioInstance) {
      ioInstance.to(recipientId.toString()).emit('notification', notification);
    }

    // 7. Process Email Delivery
    if (emailAllowed) {
      if (pref.emailDigest === 'instant') {
        try {
          const compiledHtml = compileEmailTemplate(title, body, severity, actionUrl, actionLabel);
          const transporter = getTransporter();

          const mailOptions = {
            from: process.env.EMAIL_FROM || 'notifications@ripomaglobal.com',
            to: recipientUser.email,
            subject: title,
            html: compiledHtml
          };

          const info = await transporter.sendMail(mailOptions);
          
          notification.channels.email.sent = true;
          notification.channels.email.sentAt = new Date();
          notification.channels.email.messageId = info.messageId || 'mock_message_id';
          await notification.save();

          console.log(`[NOTIFY EMAIL] Instant alert email sent to ${recipientUser.email}: messageId=${info.messageId}`);
        } catch (emailErr) {
          console.error(`[NOTIFY EMAIL ERROR] Email transport failed to ${recipientUser.email}:`, emailErr);
        }
      } else if (pref.emailDigest === 'daily' || pref.emailDigest === 'weekly') {
        // Enqueue for next cron digest cycle
        await NotificationDigestQueue.create({
          user: recipientId,
          notification: notification._id
        });
        console.log(`[NOTIFY DIGEST] Enqueued notification digest item for user ${recipientUser.name}`);
      }
    }

    return notification;
  } catch (error) {
    console.error('[NOTIFY SERVICE ERROR] Failed to send notification:', error);
    throw error;
  }
};

module.exports = {
  init,
  sendNotification
};
