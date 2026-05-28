const mongoose = require('mongoose');

const ContactPersonSchema = new mongoose.Schema({
  name: { type: String },
  title: { type: String },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String },
  isPrimary: { type: Boolean, default: false }
}, { _id: true });

const DocumentSchema = new mongoose.Schema({
  name: { type: String },
  url: { type: String },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const AddressSchema = new mongoose.Schema({
  street: { type: String },
  city: { type: String },
  state: { type: String },
  postalCode: { type: String },
  country: { type: String }
}, { _id: false });

const CustomerSchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  code: { type: String, unique: true, uppercase: true, trim: true },
  type: {
    type: String,
    enum: ['retailer', 'wholesaler', 'distributor', 'end-user', 'government', 'other'],
    default: 'retailer'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'prospect', 'vip'],
    default: 'active'
  },
  country: { type: String, trim: true },
  address: AddressSchema,
  shippingAddress: AddressSchema,
  website: { type: String, trim: true },
  taxId: { type: String, trim: true },
  currency: { type: String, default: 'USD' },
  paymentTerms: { type: String },
  creditLimit: { type: Number, default: 0, min: 0 },
  outstandingBalance: { type: Number, default: 0, min: 0 },
  rating: { type: Number, min: 1, max: 5 },
  tags: [{ type: String }],
  notes: { type: String },
  source: {
    type: String,
    enum: ['referral', 'direct', 'trade-show', 'online', 'other']
  },
  contacts: [ContactPersonSchema],
  documents: [DocumentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

CustomerSchema.index({ companyName: 'text', code: 'text' });
CustomerSchema.index({ status: 1, deleted: 1 });

module.exports = mongoose.model('Customer', CustomerSchema);
