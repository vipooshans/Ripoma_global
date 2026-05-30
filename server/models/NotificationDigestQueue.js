const mongoose = require('mongoose');

const NotificationDigestQueueSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notification: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification', required: true },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
  }
);

NotificationSchema = NotificationDigestQueueSchema.index({ user: 1, sent: 1 });

module.exports = mongoose.model('NotificationDigestQueue', NotificationDigestQueueSchema);
