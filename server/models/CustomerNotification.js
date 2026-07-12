const mongoose = require('mongoose');

const ChannelDeliverySchema = new mongoose.Schema(
  {
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
    messageId: { type: String }
  },
  { _id: false }
);

const CustomerNotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerAccount',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'order_placed',
        'order_status',
        'payment_update',
        'shipment_update',
        'reminder',
        'promotion',
        'review_update',
        'support_update'
      ],
      required: true
    },
    severity: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info'
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    actionUrl: { type: String },
    actionLabel: { type: String },
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityRef: { type: String },
    channels: {
      inApp: { type: ChannelDeliverySchema, default: () => ({}) },
      email: { type: ChannelDeliverySchema, default: () => ({}) },
      sms: { type: ChannelDeliverySchema, default: () => ({}) }
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CustomerNotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
CustomerNotificationSchema.index({ recipient: 1, type: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('CustomerNotification', CustomerNotificationSchema);
