const mongoose = require('mongoose');

const SupportMessageSchema = new mongoose.Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    byRole: {
      type: String,
      enum: ['customer', 'staff', 'guest'],
      required: true
    },
    authorName: { type: String, trim: true, default: '' },
    at: { type: Date, default: Date.now }
  },
  { _id: true }
);

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    type: {
      type: String,
      enum: ['inquiry', 'complaint', 'chat'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    category: {
      type: String,
      enum: ['shipping', 'order', 'product', 'billing', 'other'],
      default: 'other'
    },
    customerAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerAccount',
      default: null,
      index: true
    },
    guestName: { type: String, trim: true, default: '' },
    guestEmail: { type: String, trim: true, lowercase: true, default: '' },
    guestPhone: { type: String, trim: true, default: '' },
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StorefrontOrder',
      default: null
    },
    messages: { type: [SupportMessageSchema], default: [] }
  },
  { timestamps: true }
);

SupportTicketSchema.index({ status: 1, updatedAt: -1 });
SupportTicketSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
