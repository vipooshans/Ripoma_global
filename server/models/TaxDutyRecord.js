const mongoose = require('mongoose');
const { baseCurrencyMiddleware } = require('../utils/baseCurrencyMiddleware');

const TaxDutyRecordSchema = new mongoose.Schema(
  {
    recordNumber: { type: String, unique: true }, // e.g., TAX-2025-00019
    type: { 
      type: String, 
      enum: ['import_duty', 'export_duty', 'vat', 'gst', 'excise', 'withholding_tax', 'customs_fee', 'other'], 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'filed', 'paid', 'disputed', 'exempt'], 
      default: 'pending' 
    },

    importOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ImportOrder', default: null },
    exportOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ExportOrder', default: null },
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', default: null },

    country: { type: String, required: true },
    hsCode: { type: String },
    description: { type: String },

    taxableValue: { type: Number },
    rate: { type: Number }, // percentage
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    amountInBaseCurrency: { type: Number },

    dueDate: { type: Date },
    dueAlertSent: { type: Boolean, default: false },
    filedDate: { type: Date },
    paidDate: { type: Date },
    referenceNumber: { type: String }, // customs declaration or tax filing number
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

TaxDutyRecordSchema.pre('save', baseCurrencyMiddleware);

module.exports = mongoose.model('TaxDutyRecord', TaxDutyRecordSchema);
