const mongoose = require('mongoose');
const { baseCurrencyMiddleware } = require('../utils/baseCurrencyMiddleware');

const ExpenseSchema = new mongoose.Schema(
  {
    expenseNumber: { type: String, unique: true }, // e.g., EXP-2025-00034
    title: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'freight', 'customs_duty', 'import_tax', 'export_tax', 'port_charges', 'handling',
        'insurance', 'inspection', 'certification', 'warehousing', 'packaging',
        'bank_charges', 'currency_conversion', 'agent_fees', 'legal', 'audit',
        'travel', 'utilities', 'salaries', 'office', 'marketing', 'other'
      ],
      required: true
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    exchangeRate: { type: Number, default: 1 },
    amountInBaseCurrency: { type: Number },

    status: { 
      type: String, 
      enum: ['draft', 'submitted', 'approved', 'rejected', 'paid'], 
      default: 'draft' 
    },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },

    // Optional links to orders/shipments this expense belongs to
    importOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportOrder', default: null },
    exportOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportOrder', default: null },
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', default: null },

    expenseDate: { type: Date, required: true },
    vendor: { type: String },
    invoiceReference: { type: String },
    receiptUrl: { type: String }, // S3 receipt URL

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

ExpenseSchema.pre('save', baseCurrencyMiddleware);

module.exports = mongoose.model('Expense', ExpenseSchema);
