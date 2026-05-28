const mongoose = require('mongoose');

const WarehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: {
      street: { type: String },
      city: { type: String },
      country: { type: String },
      postalCode: { type: String }
    },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    capacity: { type: Number }, // max units
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Warehouse', WarehouseSchema);
