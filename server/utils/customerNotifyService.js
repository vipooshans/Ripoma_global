const CustomerAccount = require('../models/CustomerAccount');
const CustomerNotification = require('../models/CustomerNotification');
const { sendAuthEmail } = require('./authEmailService');
const { getFrontendUrl } = require('./customerAuthConfig');

const DEFAULT_PREFS = {
  orderUpdates: true,
  shipmentUpdates: true,
  paymentUpdates: true,
  reminders: true,
  marketing: false,
  channels: {
    email: true,
    sms: false,
    inApp: true
  }
};

const TYPE_PREF_KEY = {
  order_placed: 'orderUpdates',
  order_status: 'orderUpdates',
  shipment_update: 'shipmentUpdates',
  payment_update: 'paymentUpdates',
  reminder: 'reminders',
  promotion: 'marketing',
  review_update: 'orderUpdates',
  support_update: 'orderUpdates'
};

const normalizePrefs = (raw) => {
  const src = raw?.toObject ? raw.toObject() : raw || {};
  return {
    ...DEFAULT_PREFS,
    ...src,
    channels: {
      ...DEFAULT_PREFS.channels,
      ...(src.channels || {})
    }
  };
};

/**
 * SMS stub — logs payload when no SMS_PROVIDER is configured.
 * Ready to swap for Twilio/etc. later.
 */
const sendCustomerSms = async ({ to, body }) => {
  if (!to) return { sent: false, reason: 'no_phone' };

  if (process.env.SMS_PROVIDER === 'twilio' && process.env.TWILIO_ACCOUNT_SID) {
    // Placeholder for future Twilio wiring
    console.log(`[SMS STUB] Twilio not fully configured. Would send to ${to}: ${body}`);
    return { sent: false, reason: 'provider_not_wired' };
  }

  console.log('\n========================================================');
  console.log(`[SMS TO: ${to}]`);
  console.log(body);
  console.log('========================================================\n');
  return { sent: true, messageId: `sms-stub-${Date.now()}` };
};

const buildAbsoluteActionUrl = (actionUrl) => {
  if (!actionUrl) return null;
  if (/^https?:\/\//i.test(actionUrl)) return actionUrl;
  const base = (getFrontendUrl() || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}${actionUrl.startsWith('/') ? '' : '/'}${actionUrl}`;
};

/**
 * Notify a customer via in-app, email, and/or SMS based on prefs.
 * Never throws to callers — errors are logged.
 */
const notifyCustomer = async ({
  customerId,
  customer: customerDoc,
  type,
  title,
  body = '',
  severity = 'info',
  actionUrl,
  actionLabel = 'View',
  entityType,
  entityId,
  entityRef
}) => {
  try {
    if (!type || !title) return null;

    const customer =
      customerDoc ||
      (await CustomerAccount.findById(customerId).select(
        'email phone firstName lastName notificationPrefs status'
      ));

    if (!customer || customer.status === 'suspended' || customer.status === 'inactive') {
      return null;
    }

    const prefs = normalizePrefs(customer.notificationPrefs);
    const prefKey = TYPE_PREF_KEY[type];
    if (prefKey && prefs[prefKey] === false) {
      return null;
    }

    const channels = {
      inApp: { sent: false, sentAt: null },
      email: { sent: false, sentAt: null, messageId: null },
      sms: { sent: false, sentAt: null, messageId: null }
    };

    let notification = null;

    if (prefs.channels.inApp !== false) {
      notification = await CustomerNotification.create({
        recipient: customer._id,
        type,
        title,
        body,
        severity,
        actionUrl: actionUrl || null,
        actionLabel: actionLabel || null,
        entityType: entityType || null,
        entityId: entityId || null,
        entityRef: entityRef || null,
        channels
      });
      notification.channels.inApp = { sent: true, sentAt: new Date() };
      await notification.save();
    }

    if (prefs.channels.email !== false && customer.email) {
      try {
        const absUrl = buildAbsoluteActionUrl(actionUrl);
        const textLines = [
          title,
          body,
          absUrl ? `\nOpen: ${absUrl}` : ''
        ].filter(Boolean);
        await sendAuthEmail({
          to: customer.email,
          subject: `[RIPOMA] ${title}`,
          text: textLines.join('\n'),
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
              <h2 style="color:#0f766e;">${title}</h2>
              <p style="color:#334155;line-height:1.5;">${body || ''}</p>
              ${
                absUrl
                  ? `<p style="margin-top:24px;"><a href="${absUrl}" style="background:#0d9488;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold;">${actionLabel || 'View'}</a></p>`
                  : ''
              }
              <p style="color:#94a3b8;font-size:12px;margin-top:32px;">RIPOMA GLOBAL · Customer alerts</p>
            </div>
          `
        });
        channels.email = { sent: true, sentAt: new Date() };
        if (notification) {
          notification.channels.email = channels.email;
          await notification.save();
        }
      } catch (emailErr) {
        console.error('[CUSTOMER NOTIFY] Email failed:', emailErr.message);
      }
    }

    if (prefs.channels.sms === true && customer.phone) {
      try {
        const smsBody = `${title}${body ? `: ${body}` : ''}`.slice(0, 320);
        const result = await sendCustomerSms({ to: customer.phone, body: smsBody });
        if (result.sent) {
          channels.sms = { sent: true, sentAt: new Date(), messageId: result.messageId };
          if (notification) {
            notification.channels.sms = channels.sms;
            await notification.save();
          }
        }
      } catch (smsErr) {
        console.error('[CUSTOMER NOTIFY] SMS failed:', smsErr.message);
      }
    }

    return notification;
  } catch (error) {
    console.error('[CUSTOMER NOTIFY] Unexpected error:', error);
    return null;
  }
};

const formatCustomerNotification = (n) => ({
  id: n._id,
  type: n.type,
  title: n.title,
  body: n.body || '',
  severity: n.severity,
  isRead: n.isRead,
  readAt: n.readAt || null,
  actionUrl: n.actionUrl || null,
  actionLabel: n.actionLabel || null,
  entityType: n.entityType || null,
  entityId: n.entityId || null,
  entityRef: n.entityRef || null,
  channels: n.channels,
  createdAt: n.createdAt
});

module.exports = {
  notifyCustomer,
  sendCustomerSms,
  normalizePrefs,
  DEFAULT_PREFS,
  formatCustomerNotification
};
