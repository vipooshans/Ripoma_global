const CustomerNotification = require('../models/CustomerNotification');
const { formatCustomerNotification } = require('../utils/customerNotifyService');

exports.listMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const notifications = await CustomerNotification.find({
      recipient: req.customerUser._id
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.status(200).json({
      notifications: notifications.map(formatCustomerNotification)
    });
  } catch (error) {
    console.error('List Customer Notifications Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await CustomerNotification.countDocuments({
      recipient: req.customerUser._id,
      isRead: false
    });
    return res.status(200).json({ count });
  } catch (error) {
    console.error('Customer Unread Count Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const notification = await CustomerNotification.findOne({
      _id: req.params.id,
      recipient: req.customerUser._id
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }
    return res.status(200).json({ notification: formatCustomerNotification(notification) });
  } catch (error) {
    console.error('Mark Customer Notification Read Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const result = await CustomerNotification.updateMany(
      { recipient: req.customerUser._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return res.status(200).json({ updated: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Mark All Customer Notifications Read Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
