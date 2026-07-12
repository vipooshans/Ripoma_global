const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['percent', 'fixed', 'free_shipping'],
      required: true
    },
    value: {
      type: Number,
      default: 0,
      min: 0
    },
    minSubtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    active: {
      type: Boolean,
      default: true
    },
    expiresAt: {
      type: Date,
      default: null
    },
    /** Total redemptions allowed (null = unlimited). */
    maxUses: {
      type: Number,
      default: null,
      min: 1
    },
    /** Max redemptions per customer account (null = unlimited). */
    maxUsesPerCustomer: {
      type: Number,
      default: 1,
      min: 1
    },
    redemptionCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
