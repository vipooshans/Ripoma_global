const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, unique: true, uppercase: true, trim: true },
    contactPerson: { type: String },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String },
    address: { type: String }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Supplier', SupplierSchema);
