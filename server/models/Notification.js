const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        // Orders
        'po_submitted', 'po_approved', 'po_rejected', 'po_received',
        'so_confirmed', 'so_dispatched', 'so_delivered',
        'storefront_cancel_requested',
        'storefront_support_ticket',
        // Shipments & logistics
        'shipment_delayed', 'shipment_delivered', 'shipment_customs_hold', 'carrier_update',
        // Inventory
        'low_stock', 'out_of_stock', 'stock_expiring',
        // Finance
        'invoice_overdue', 'payment_overdue', 'payment_received', 'credit_limit_exceeded',
        // Documents
        'document_expiring', 'document_uploaded',
        // Tax & compliance
        'tax_due', 'duty_due',
        // System
        'user_added', 'role_changed', 'report_ready', 'scheduled_report_sent',
        // Reminders
        'reminder'
      ],
      required: true
    },
    severity: { 
      type: String, 
      enum: ['info', 'success', 'warning', 'error'], 
      default: 'info' 
    },
    title: { type: String, required: true },
    body: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    isDismissed: { type: Boolean, default: false },

    // Deep link — clicking the notification navigates here
    actionUrl: { type: String },
    actionLabel: { type: String },

    // Source entity (what triggered this notification)
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityRef: { type: String }, // e.g. "PO-2025-00042", denormalised

    // Delivery channels attempted
    channels: {
      inApp: { 
        sent: { type: Boolean, default: false }, 
        sentAt: { type: Date } 
      },
      email: { 
        sent: { type: Boolean, default: false }, 
        sentAt: { type: Date }, 
        messageId: { type: String } 
      }
    },

    createdAt: { type: Date, default: Date.now }
  }
);

// Indexes for query performance
NotificationSchema.index({ recipient: 1, isRead: 1, isDismissed: 1 });
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
