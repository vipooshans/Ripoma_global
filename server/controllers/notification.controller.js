const Notification = require('../models/Notification');

// List notifications for the authenticated user
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead, type, severity } = req.query;
    
    const query = { recipient: req.user._id, isDismissed: false };
    
    if (isRead !== undefined && isRead !== '') {
      query.isRead = isRead === 'true';
    }
    if (type) {
      query.type = type;
    }
    if (severity) {
      query.severity = severity;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      notifications,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('[NOTIFICATION CONTROLLER] getNotifications error:', error);
    res.status(500).json({ success: false, message: 'Server error listing notifications' });
  }
};

// Mark a single notification as read
exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('[NOTIFICATION CONTROLLER] markRead error:', error);
    res.status(500).json({ success: false, message: 'Server error marking notification as read' });
  }
};

// Mark all notifications as read for the user
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[NOTIFICATION CONTROLLER] markAllRead error:', error);
    res.status(500).json({ success: false, message: 'Server error marking all notifications as read' });
  }
};

// Dismiss a notification (hide from dashboard)
exports.dismissNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isDismissed: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('[NOTIFICATION CONTROLLER] dismissNotification error:', error);
    res.status(500).json({ success: false, message: 'Server error dismissing notification' });
  }
};

// Get count of unread notifications
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
      isDismissed: false
    });

    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('[NOTIFICATION CONTROLLER] getUnreadCount error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching unread count' });
  }
};
