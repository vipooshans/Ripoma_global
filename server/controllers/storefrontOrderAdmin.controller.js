const StorefrontOrder = require('../models/StorefrontOrder');
const { formatStorefrontOrder } = require('../utils/storefrontOrderFormat');

const STAFF_STATUSES = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
];

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

    const { orderStatus, trackingNumber, carrier, note } = req.body || {};

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Cannot change status of a cancelled order.' });
    }
    if (order.orderStatus === 'cancellation_requested') {
      return res.status(400).json({
        message: 'Resolve the cancellation request first (approve or reject).'
      });
    }

    if (orderStatus) {
      if (!STAFF_STATUSES.includes(orderStatus) || orderStatus === 'cancelled') {
        return res.status(400).json({
          message: 'Invalid status. Use cancel-approve to cancel, or a fulfillment status.'
        });
      }
      if (orderStatus !== order.orderStatus) {
        order.orderStatus = orderStatus;
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          status: orderStatus,
          note: note || `Status updated by staff`,
          at: new Date(),
          byRole: 'staff'
        });
      }
    }

    if (trackingNumber !== undefined) {
      order.trackingNumber = String(trackingNumber || '').trim() || null;
    }
    if (carrier !== undefined) {
      order.carrier = String(carrier || '').trim() || null;
    }

    await order.save();
    await order.populate('customerAccount', 'firstName lastName email phone');
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
    await order.populate('customerAccount', 'firstName lastName email phone');
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
    await order.populate('customerAccount', 'firstName lastName email phone');
    return res.status(200).json({ order: formatAdminOrder(order) });
  } catch (error) {
    console.error('Admin Reject Cancel Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
