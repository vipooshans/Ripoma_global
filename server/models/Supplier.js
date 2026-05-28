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

const SupplierSchema = new mongoose.Schema({
  companyName: { type: String, required: true, trim: true },
  code: { type: String, unique: true, uppercase: true, trim: true },
  type: {
    type: String,
    enum: ['manufacturer', 'distributor', 'trader', 'agent', 'other'],
    default: 'manufacturer'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active'
  },
  country: { type: String, trim: true },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String }
  },
  website: { type: String, trim: true },
  taxId: { type: String, trim: true },
  currency: { type: String, default: 'USD' },
  paymentTerms: { type: String },
  leadTimeDays: { type: Number, min: 0 },
  rating: { type: Number, min: 1, max: 5 },
  tags: [{ type: String }],
  notes: { type: String },
  contacts: [ContactPersonSchema],
  bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String },
    swiftCode: { type: String },
    iban: { type: String }
  },
  documents: [DocumentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

SupplierSchema.index({ companyName: 'text', code: 'text' });
SupplierSchema.index({ status: 1, deleted: 1 });

module.exports = mongoose.model('Supplier', SupplierSchema);
