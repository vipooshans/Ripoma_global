const mongoose = require('mongoose');

const ApprovalRecordSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['approved', 'rejected', 'requested_changes'], required: true },
  comments: { type: String },
  actionedAt: { type: Date, default: Date.now }
});

const ImportOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  description: { type: String },
  quantityOrdered: { type: Number, required: true },
  quantityReceived: { type: Number, default: 0 },
  unitCost: { type: Number, required: true },
  discount: { type: Number, default: 0 }, // percentage
  tax: { type: Number, default: 0 }, // percentage
  lineTotal: { type: Number } // qty * unitCost * (1 - discount/100) * (1 + tax/100)
});

const ImportOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, unique: true }, // auto-generated
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'ordered', 'in_transit', 'partially_received', 'received', 'cancelled'],
      default: 'draft'
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    currency: { type: String, default: 'USD' },
    exchangeRate: { type: Number, default: 1 },

    items: [ImportOrderItemSchema],

    subtotal: { type: Number },
    taxTotal: { type: Number },
    discountTotal: { type: Number },
    shippingCost: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    grandTotal: { type: Number },

    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    shippingMethod: { type: String, enum: ['sea', 'air', 'road', 'rail', 'courier'], default: 'sea' },
    incoterms: { type: String, enum: ['EXW', 'FCA', 'FOB', 'CIF', 'DAP', 'DDP', 'other'] },

    orderDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    deliveryAddress: {
      street: { type: String },
      city: { type: String },
      country: { type: String },
      postalCode: { type: String }
    },

    paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
    paymentTerms: { type: String },
    amountPaid: { type: Number, default: 0 },

    notes: { type: String },
    internalNotes: { type: String },
    tags: [{ type: String }],

    documents: [
      {
        name: { type: String },
        type: { type: String, enum: ['proforma_invoice', 'commercial_invoice', 'packing_list', 'bill_of_lading', 'certificate_of_origin', 'customs_declaration', 'other'] },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],

    approvals: [ApprovalRecordSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ImportOrder', ImportOrderSchema);
