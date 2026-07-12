const StorefrontOrder = require('../models/StorefrontOrder');
const CustomerAccount = require('../models/CustomerAccount');
const { formatStorefrontOrder } = require('../utils/storefrontOrderFormat');
const { notifyCustomer } = require('../utils/customerNotifyService');

const STAFF_STATUSES = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
];

const PAYMENT_STATUSES = ['pending', 'awaiting_transfer', 'paid', 'failed'];

const statusLabel = (status) =>
  String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const notifyOrderCustomer = async (order, payload) => {
  const customerId = order.customerAccount?._id || order.customerAccount;
  if (!customerId) return;
  await notifyCustomer({
    customerId,
    ...payload,
    actionUrl: payload.actionUrl || `/customer/orders/${order._id}`,
    actionLabel: payload.actionLabel || 'View order',
    entityType: 'StorefrontOrder',
    entityId: order._id,
    entityRef: order.orderNumber
  });
};
const formatAdminOrder = (order) => ({
  ...formatStorefrontOrder(order),
  previousStatusBeforeCancelRequest: order.previousStatusBeforeCancelRequest || null,
  customerAccount: order.customerAccount
    ? {
        id: order.customerAccount._id || order.customerAccount,
        email: order.customerAccount.email,
        firstName: order.customerAccount.firstName,
        lastName: order.customerAccount.lastName,
        phone: order.customerAccount.phone
      }
    : null
});

exports.listOrders = async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.orderStatus = status;
    if (search && search.trim()) {
      query.$or = [
        { orderNumber: { $regex: search.trim(), $options: 'i' } },
        { 'contact.email': { $regex: search.trim(), $options: 'i' } },
        { 'contact.firstName': { $regex: search.trim(), $options: 'i' } },
        { 'contact.lastName': { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      StorefrontOrder.find(query)
        .populate('customerAccount', 'firstName lastName email phone')
        .sort({ placedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      StorefrontOrder.countDocuments(query)
    ]);

    return res.status(200).json({
      orders: orders.map(formatAdminOrder),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error('Admin List Storefront Orders Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await StorefrontOrder.findById(req.params.id).populate(
      'customerAccount',
      'firstName lastName email phone'
    );
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    return res.status(200).json({ order: formatAdminOrder(order) });
  } catch (error) {
    console.error('Admin Get Storefront Order Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const order = await StorefrontOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const {
      orderStatus,
      trackingNumber,
      carrier,
      note,
      estimatedDeliveryDate,
      trackingUrl,
      shipmentNote,
      paymentStatus
    } = req.body || {};

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Cannot change status of a cancelled order.' });
    }
    if (order.orderStatus === 'cancellation_requested') {
      return res.status(400).json({
        message: 'Resolve the cancellation request first (approve or reject).'
      });
    }

    const prev = {
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      trackingNumber: order.trackingNumber || null,
      carrier: order.carrier || null,
      estimatedDeliveryDate: order.estimatedDeliveryDate
        ? new Date(order.estimatedDeliveryDate).toISOString().slice(0, 10)
        : null,
      trackingUrl: order.trackingUrl || null
    };

    let statusChanged = false;
    let paymentChanged = false;
    order.shipmentUpdates = order.shipmentUpdates || [];
    order.statusHistory = order.statusHistory || [];

    if (orderStatus) {
      if (!STAFF_STATUSES.includes(orderStatus) || orderStatus === 'cancelled') {
        return res.status(400).json({
          message: 'Invalid status. Use cancel-approve to cancel, or a fulfillment status.'
        });
      }
      if (orderStatus !== order.orderStatus) {
        order.orderStatus = orderStatus;
        statusChanged = true;
        order.statusHistory.push({
          status: orderStatus,
          note: note || 'Status updated by staff',
          at: new Date(),
          byRole: 'staff'
        });
      }
    }

    if (paymentStatus !== undefined && paymentStatus !== '') {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status.' });
      }
      if (paymentStatus !== order.paymentStatus) {
        order.paymentStatus = paymentStatus;
        paymentChanged = true;
      }
    }

    if (trackingNumber !== undefined) {
      order.trackingNumber = String(trackingNumber || '').trim() || null;
    }
    if (carrier !== undefined) {
      order.carrier = String(carrier || '').trim() || null;
    }
    if (trackingUrl !== undefined) {
      order.trackingUrl = String(trackingUrl || '').trim() || null;
    }
    if (estimatedDeliveryDate !== undefined) {
      if (estimatedDeliveryDate === null || estimatedDeliveryDate === '') {
        order.estimatedDeliveryDate = null;
      } else {
        const d = new Date(estimatedDeliveryDate);
        order.estimatedDeliveryDate = Number.isNaN(d.getTime()) ? order.estimatedDeliveryDate : d;
      }
    }

    const addDays = (base, days) => {
      const d = new Date(base);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + days);
      return d;
    };

    if (statusChanged && order.orderStatus === 'shipped') {
      if (!order.estimatedDeliveryDate) {
        const base = order.placedAt || new Date();
        order.estimatedDeliveryDate = addDays(base, 5);
      }
      const shipMsg = [
        'Shipped',
        order.carrier ? `via ${order.carrier}` : null,
        order.trackingNumber ? `· ${order.trackingNumber}` : null
      ]
        .filter(Boolean)
        .join(' ');
      order.shipmentUpdates.push({
        message: shipMsg,
        at: new Date(),
        byRole: 'staff'
      });
    }

    if (statusChanged && order.orderStatus === 'delivered') {
      order.actualDeliveredAt = new Date();
      order.shipmentUpdates.push({
        message: 'Delivered',
        at: new Date(),
        byRole: 'staff'
      });
    }

    const noteText = String(shipmentNote || '').trim();
    if (noteText) {
      order.shipmentUpdates.push({
        message: noteText,
        at: new Date(),
        byRole: 'staff'
      });
    }

    const nextEta = order.estimatedDeliveryDate
      ? new Date(order.estimatedDeliveryDate).toISOString().slice(0, 10)
      : null;
    const trackingChanged =
      (trackingNumber !== undefined && (order.trackingNumber || null) !== prev.trackingNumber) ||
      (carrier !== undefined && (order.carrier || null) !== prev.carrier) ||
      (trackingUrl !== undefined && (order.trackingUrl || null) !== prev.trackingUrl) ||
      (estimatedDeliveryDate !== undefined && nextEta !== prev.estimatedDeliveryDate);

    const alreadyLoggedShipOrDeliver =
      statusChanged && (order.orderStatus === 'shipped' || order.orderStatus === 'delivered');

    if (trackingChanged && !noteText && !alreadyLoggedShipOrDeliver) {
      const parts = [];
      if (order.carrier && order.carrier !== prev.carrier) parts.push(`Carrier: ${order.carrier}`);
      if (order.trackingNumber && order.trackingNumber !== prev.trackingNumber) {
        parts.push(`Tracking: ${order.trackingNumber}`);
      }
      if (order.trackingUrl && order.trackingUrl !== prev.trackingUrl) {
        parts.push('Tracking link updated');
      }
      if (nextEta && nextEta !== prev.estimatedDeliveryDate) {
        parts.push(`ETA: ${nextEta}`);
      }
      if (parts.length) {
        order.shipmentUpdates.push({
          message: parts.join(' · '),
          at: new Date(),
          byRole: 'staff'
        });
      }
    }

    await order.save();
    await order.populate('customerAccount', 'firstName lastName email phone notificationPrefs status');

    if (statusChanged) {
      await notifyOrderCustomer(order, {
        type: 'order_status',
        title: `Order ${order.orderNumber}: ${statusLabel(order.orderStatus)}`,
        body: note || `Your order status is now ${statusLabel(order.orderStatus)}.`,
        severity: order.orderStatus === 'delivered' ? 'success' : 'info'
      });
    }

    if (
      noteText ||
      (trackingChanged && !statusChanged) ||
      (statusChanged && (order.orderStatus === 'shipped' || order.orderStatus === 'delivered'))
    ) {
      const latestShip = order.shipmentUpdates[order.shipmentUpdates.length - 1];
      await notifyOrderCustomer(order, {
        type: 'shipment_update',
        title: `Shipment update · ${order.orderNumber}`,
        body: latestShip?.message || noteText || 'Your shipment details were updated.',
        severity: 'info'
      });
    }

    if (paymentChanged) {
      await notifyOrderCustomer(order, {
        type: 'payment_update',
        title: `Payment update · ${order.orderNumber}`,
        body: `Payment status is now ${statusLabel(order.paymentStatus)}.`,
        severity: order.paymentStatus === 'paid' ? 'success' : 'info'
      });
    }

    return res.status(200).json({ order: formatAdminOrder(order) });
  } catch (error) {
    console.error('Admin Update Storefront Order Status Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.approveCancel = async (req, res) => {
  try {
    const order = await StorefrontOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.orderStatus !== 'cancellation_requested') {
      return res.status(400).json({ message: 'Order is not awaiting cancellation approval.' });
    }

    order.orderStatus = 'cancelled';
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'cancelled',
      note: req.body?.note || 'Cancellation approved by staff',
      at: new Date(),
      byRole: 'staff'
    });
    await order.save();
    await order.populate('customerAccount', 'firstName lastName email phone notificationPrefs status');
    await notifyOrderCustomer(order, {
      type: 'order_status',
      title: `Order ${order.orderNumber} cancelled`,
      body: req.body?.note || 'Your cancellation request was approved. The order has been cancelled.',
      severity: 'warning'
    });
    return res.status(200).json({ order: formatAdminOrder(order) });
  } catch (error) {
    console.error('Admin Approve Cancel Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.rejectCancel = async (req, res) => {
  try {
    const order = await StorefrontOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.orderStatus !== 'cancellation_requested') {
      return res.status(400).json({ message: 'Order is not awaiting cancellation approval.' });
    }

    const restored = order.previousStatusBeforeCancelRequest || 'confirmed';
    order.orderStatus = restored;
    order.cancelReason = '';
    order.cancellationRequestedAt = null;
    order.previousStatusBeforeCancelRequest = null;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: restored,
      note: req.body?.note || 'Cancellation request rejected by staff',
      at: new Date(),
      byRole: 'staff'
    });
    await order.save();
    await order.populate('customerAccount', 'firstName lastName email phone notificationPrefs status');
    await notifyOrderCustomer(order, {
      type: 'order_status',
      title: `Order ${order.orderNumber}: cancellation declined`,
      body:
        req.body?.note ||
        `Your cancellation request was not approved. The order remains ${statusLabel(restored)}.`,
      severity: 'info'
    });
    return res.status(200).json({ order: formatAdminOrder(order) });
  } catch (error) {
    console.error('Admin Reject Cancel Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.sendPromoNotify = async (req, res) => {
  try {
    const subject = String(req.body?.subject || '').trim();
    const body = String(req.body?.body || '').trim();
    if (!subject || !body) {
      return res.status(400).json({ message: 'Subject and body are required.' });
    }

    const customers = await CustomerAccount.find({
      status: 'active',
      'notificationPrefs.marketing': true
    }).select('_id email firstName lastName phone notificationPrefs status');

    let sent = 0;
    for (const customer of customers) {
      const result = await notifyCustomer({
        customer,
        type: 'promotion',
        title: subject,
        body,
        severity: 'info',
        actionUrl: '/customer/products',
        actionLabel: 'Shop now'
      });
      if (result) sent += 1;
    }

    return res.status(200).json({
      message: `Promotion queued for ${sent} opted-in customer(s).`,
      matched: customers.length,
      sent
    });
  } catch (error) {
    console.error('Send Promo Notify Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
