const mongoose = require('mongoose');

const CustomerSessionSchema = new mongoose.Schema(
  {
    customerAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerAccount',
      required: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true
    },
    userAgent: { type: String, trim: true, default: '' },
    ip: { type: String, trim: true, default: '' },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

CustomerSessionSchema.index({ customerAccount: 1, revokedAt: 1 });

module.exports = mongoose.model('CustomerSession', CustomerSessionSchema);
