const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Null means system-wide/all admins
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['delay_alert', 'carrier_update', 'warehouse_update', 'general'], 
      default: 'general' 
    },
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', default: null },
    isRead: { type: Boolean, default: false }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', NotificationSchema);
