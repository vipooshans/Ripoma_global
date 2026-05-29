const mongoose = require('mongoose');

const GoodsReceiptItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantityExpected: { type: Number, required: true },
  quantityReceived: { type: Number, required: true },
  quantityRejected: { type: Number, default: 0 },
  rejectionReason: { type: String },
  batchNumber: { type: String },
  expiryDate: { type: Date },
  condition: { type: String, enum: ['good', 'damaged', 'short_expiry'], default: 'good' }
});

const GoodsReceiptSchema = new mongoose.Schema(
  {
    importOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportOrder', required: true },
    receiptNumber: { type: String, unique: true }, // auto-generated
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedAt: { type: Date, default: Date.now },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    items: [GoodsReceiptItemSchema],
    notes: { type: String },
    documents: [
      {
        name: { type: String },
        url: { type: String }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('GoodsReceipt', GoodsReceiptSchema);
