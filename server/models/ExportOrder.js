const mongoose = require('mongoose');

const ExportOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  description: { type: String },
  quantityOrdered: { type: Number, required: true },
  quantityDispatched: { type: Number, default: 0 },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 }, // percentage
  tax: { type: Number, default: 0 }, // percentage
  lineTotal: { type: Number } // computed: qty * unitPrice * (1 - discount/100) * (1 + tax/100)
});

const ExportOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true }, // SO-[YEAR]-[5-digit]
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    status: {
      type: String,
      enum: ['draft', 'confirmed', 'processing', 'ready_to_ship', 'dispatched', 'in_transit', 'delivered', 'cancelled', 'returned'],
      default: 'draft'
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    currency: { type: String, default: 'USD' },
    exchangeRate: { type: Number, default: 1 },

    items: [ExportOrderItemSchema],

    subtotal: { type: Number },
    taxTotal: { type: Number },
    discountTotal: { type: Number },
    shippingCharge: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    grandTotal: { type: Number },

    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }, // source warehouse
    shippingMethod: { type: String, enum: ['sea', 'air', 'road', 'rail', 'courier'], default: 'sea' },
    incoterms: { type: String, enum: ['EXW', 'FCA', 'FOB', 'CIF', 'DAP', 'DDP', 'other'] },
    paymentTerms: { type: String },
    paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
    amountPaid: { type: Number, default: 0 },

    orderDate: { type: Date, default: Date.now },
    confirmedDate: { type: Date },
    requestedDeliveryDate: { type: Date },
    estimatedDispatchDate: { type: Date },

    billingAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String }
    },
    shippingAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String }
    },

    customerReference: { type: String },
    notes: { type: String },
    internalNotes: { type: String },
    tags: [{ type: String }],

    documents: [
      {
        name: { type: String },
        type: { type: String, enum: ['proforma_invoice', 'commercial_invoice', 'packing_list', 'certificate_of_origin', 'customs_declaration', 'delivery_note', 'other'] },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],

    timeline: [
      {
        action: { type: String, required: true },
        details: { type: String },
        note: { type: String },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now }
      }
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ExportOrder', ExportOrderSchema);
