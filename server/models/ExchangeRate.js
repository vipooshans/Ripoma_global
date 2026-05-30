const mongoose = require('mongoose');

const ExchangeRateSchema = new mongoose.Schema(
  {
    baseCurrency: { type: String, default: 'USD' },
    date: { type: Date, required: true },
    rates: { type: Map, of: Number }, // e.g. { EUR: 0.92, SGD: 1.35, GBP: 0.79 }
    source: { type: String, default: 'openexchangerates' },
    fetchedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

// Index on date for efficient rate lookups
ExchangeRateSchema.index({ date: 1 });

module.exports = mongoose.model('ExchangeRate', ExchangeRateSchema);
