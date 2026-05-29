const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: { type: String },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 }, // percentage
  tax: { type: Number, default: 0 }, // percentage
  lineTotal: { type: Number, required: true }
});

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true }, // INV-[YEAR]-[5-digit]
    type: { type: String, enum: ['proforma', 'commercial'], default: 'commercial' },
    exportOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportOrder', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'],
      default: 'draft'
    },

    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    paidDate: { type: Date },

    currency: { type: String, default: 'USD' },
    subtotal: { type: Number },
    taxTotal: { type: Number },
    discountTotal: { type: Number },
    shippingCharge: { type: Number, default: 0 },
    grandTotal: { type: Number },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number }, // computed: grandTotal - amountPaid

    items: [InvoiceItemSchema],

    paymentInstructions: { type: String },
    notes: { type: String },
    pdfUrl: { type: String }, // stored PDF URL after generation

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

// Virtual for amountDue calculation on retrieval
InvoiceSchema.virtual('calculatedAmountDue').get(function () {
  return Math.round((this.grandTotal - this.amountPaid) * 100) / 100;
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
