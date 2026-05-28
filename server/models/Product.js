const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    unit: { type: String, enum: ['pcs', 'kg', 'g', 'l', 'ml', 'box', 'carton', 'roll', 'set'], default: 'pcs' },
    unitCost: { type: Number, default: 0 }, // base purchase cost
    sellingPrice: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    images: [{ type: String }], // URL array
    barcode: { type: String },
    hsCode: { type: String }, // Harmonized System code for import/export
    countryOfOrigin: { type: String },
    weight: { type: Number }, // in kg
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number }
    }, // in cm
    tags: [{ type: String }],
    status: { type: String, enum: ['active', 'inactive', 'discontinued'], default: 'active' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    lowStockThreshold: { type: Number, default: 10 },
    reorderQuantity: { type: Number, default: 50 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted: { type: Boolean, default: false } // Soft delete support
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Product', ProductSchema);
