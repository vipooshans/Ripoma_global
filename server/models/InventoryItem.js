const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantityOnHand: { type: Number, default: 0 },
    quantityReserved: { type: Number, default: 0 }, // allocated to orders not yet shipped
    lastStockCheck: { type: Date },
    batchNumber: { type: String, trim: true },
    expiryDate: { type: Date },
    location: { type: String, trim: true } // bin/shelf location within warehouse
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for quantityAvailable = quantityOnHand - quantityReserved
InventoryItemSchema.virtual('quantityAvailable').get(function () {
  return this.quantityOnHand - this.quantityReserved;
});

// Composite index to ensure unique stock per product per warehouse
InventoryItemSchema.index({ product: 1, warehouse: 1 }, { unique: true });

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
