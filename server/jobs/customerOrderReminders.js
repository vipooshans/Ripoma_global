const cron = require('node-cron');
const StorefrontOrder = require('../models/StorefrontOrder');
const CustomerNotification = require('../models/CustomerNotification');
const { notifyCustomer } = require('../utils/customerNotifyService');

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const alreadyReminded = async (customerId, entityId, sinceDays = 6) => {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const existing = await CustomerNotification.findOne({
    recipient: customerId,
    type: 'reminder',
    entityId,
    createdAt: { $gte: since }
  }).select('_id');
  return Boolean(existing);
};

const runCustomerOrderReminders = async () => {
  try {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const tomorrowStart = startOfDay(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const tomorrowEnd = endOfDay(tomorrowStart);

    const unpaid = await StorefrontOrder.find({
      paymentMethod: 'bank_transfer',
      paymentStatus: { $in: ['pending', 'awaiting_transfer'] },
      orderStatus: { $nin: ['cancelled', 'delivered'] },
      placedAt: { $lte: twoDaysAgo }
    })
      .populate('customerAccount', 'email phone firstName lastName notificationPrefs status')
      .limit(100);

    for (const order of unpaid) {
      const customer = order.customerAccount;
      if (!customer) continue;
      if (await alreadyReminded(customer._id, order._id)) continue;
      await notifyCustomer({
        customer,
        type: 'reminder',
        title: `Payment reminder · ${order.orderNumber}`,
        body: `Your bank transfer for order ${order.orderNumber} is still pending. Please complete payment to avoid delays.`,
        severity: 'warning',
        actionUrl: `/customer/orders/${order._id}`,
        actionLabel: 'View order',
        entityType: 'StorefrontOrder',
        entityId: order._id,
        entityRef: order.orderNumber
      });
    }

    const etaSoon = await StorefrontOrder.find({
      orderStatus: 'shipped',
      estimatedDeliveryDate: { $gte: tomorrowStart, $lte: tomorrowEnd }
    })
      .populate('customerAccount', 'email phone firstName lastName notificationPrefs status')
      .limit(100);

    for (const order of etaSoon) {
      const customer = order.customerAccount;
      if (!customer) continue;
      if (await alreadyReminded(customer._id, order._id)) continue;
      const eta = new Date(order.estimatedDeliveryDate).toLocaleDateString();
      await notifyCustomer({
        customer,
        type: 'reminder',
        title: `Delivery tomorrow · ${order.orderNumber}`,
        body: `Your order is estimated to arrive on ${eta}. Track progress from your order page.`,
        severity: 'info',
        actionUrl: `/customer/orders/${order._id}`,
        actionLabel: 'Track order',
        entityType: 'StorefrontOrder',
        entityId: order._id,
        entityRef: order.orderNumber
      });
    }
  } catch (error) {
    console.error('[CRON ERROR] Customer order reminders failed:', error);
  }
};

const initCustomerOrderReminderCron = () => {
  cron.schedule('0 */6 * * *', async () => {
    await runCustomerOrderReminders();
  });
  console.log('[CRON] Customer order reminders job (every 6h) initialized.');
};

module.exports = {
  runCustomerOrderReminders,
  initCustomerOrderReminderCron
};
