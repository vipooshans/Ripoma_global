const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    type: {
      type: String,
      enum: ['receive', 'issue', 'transfer_in', 'transfer_out', 'adjustment', 'return'],
      required: true
    },
    quantity: { type: Number, required: true }, // positive = in, negative = out
    quantityBefore: { type: Number },
    quantityAfter: { type: Number },
    reference: { type: String, trim: true }, // PO number, order ID, etc.
    note: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // only track creation timestamp
  }
);

module.exports = mongoose.model('StockMovement', StockMovementSchema);
