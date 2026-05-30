const mongoose = require('mongoose');
const { baseCurrencyMiddleware } = require('../utils/baseCurrencyMiddleware');

const PaymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, unique: true }, // e.g., PAY-2025-00061
    type: { type: String, enum: ['inbound', 'outbound'], required: true }, // inbound = from customer, outbound = to supplier/other
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'], 
      default: 'pending' 
    },

    // Polymorphic source links - exactly one of these is typically set
    importOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportOrder', default: null },
    exportOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportOrder', default: null },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    expense: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },

    // Counterparty details
    counterpartyType: { type: String, enum: ['supplier', 'customer', 'bank', 'government', 'other'] },
    counterpartyId: { type: mongoose.Schema.Types.ObjectId }, // ref Customer or Supplier
    counterpartyName: { type: String }, // denormalized name for display

    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    exchangeRate: { type: Number, default: 1 }, // to base currency
    amountInBaseCurrency: { type: Number }, // computed pre-save: amount * exchangeRate

    paymentMethod: { 
      type: String, 
      enum: ['bank_transfer', 'cheque', 'cash', 'credit_card', 'letter_of_credit', 'other'] 
    },
    referenceNumber: { type: String }, // bank reference, cheque number, transaction ID
    bankAccount: { type: String }, // company bank account details
    paymentDate: { type: Date },
    dueDate: { type: Date },
    isOverdue: { type: Boolean, default: false }, // set via cron job when dueDate < today and status is pending

    notes: { type: String },
    attachments: [
      {
        name: { type: String },
        url: { type: String }
      }
    ],

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

// Mongoose pre-save middleware to calculate base currency fields
PaymentSchema.pre('save', baseCurrencyMiddleware);

module.exports = mongoose.model('Payment', PaymentSchema);
