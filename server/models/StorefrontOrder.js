const mongoose = require('mongoose');

const ShippingAddressSnapshotSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, required: true },
    city: { type: String, trim: true, required: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true, required: true }
  },
  { _id: false }
);

const ContactSnapshotSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true }
  },
  { _id: false }
);

const StorefrontOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    sku: { type: String, trim: true },
    name: { type: String, trim: true, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    image: { type: String, default: null }
  },
  { _id: false }
);

const CouponSnapshotSchema = new mongoose.Schema(
  {
    code: String,
    type: String,
    label: String
  },
  { _id: false }
);

const StatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, trim: true, default: '' },
    at: { type: Date, default: Date.now },
    byRole: { type: String, enum: ['customer', 'staff'], default: 'staff' }
  },
  { _id: false }
);

const ShipmentUpdateSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
    byRole: { type: String, enum: ['staff', 'system'], default: 'staff' }
  },
  { _id: false }
);

const StorefrontOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    customerAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerAccount',
      required: true,
      index: true
    },
    items: {
      type: [StorefrontOrderItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, 'Order must have at least one item']
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'LKR' },
    couponCode: { type: String, trim: true, uppercase: true, default: null },
    couponSnapshot: { type: CouponSnapshotSchema, default: null },
    shippingAddress: { type: ShippingAddressSnapshotSchema, required: true },
    contact: { type: ContactSnapshotSchema, default: {} },
    paymentMethod: {
      type: String,
      enum: ['cod', 'bank_transfer', 'card_mock'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'awaiting_transfer', 'paid', 'failed'],
      default: 'pending'
    },
    orderStatus: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancellation_requested',
        'cancelled'
      ],
      default: 'placed'
    },
    customerNote: { type: String, trim: true, default: '' },
    paymentReference: { type: String, trim: true, default: null },
    riskFlags: { type: [String], default: [] },
    placedAt: { type: Date, default: Date.now },
    cancelReason: { type: String, trim: true, default: '' },
    cancellationRequestedAt: { type: Date, default: null },
    previousStatusBeforeCancelRequest: { type: String, default: null },
    trackingNumber: { type: String, trim: true, default: null },
    carrier: { type: String, trim: true, default: null },
    estimatedDeliveryDate: { type: Date, default: null },
    trackingUrl: { type: String, trim: true, default: null },
    actualDeliveredAt: { type: Date, default: null },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    shipmentUpdates: { type: [ShipmentUpdateSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StorefrontOrder', StorefrontOrderSchema);
