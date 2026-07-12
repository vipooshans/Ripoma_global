const mongoose = require('mongoose');

const ProductReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerAccount',
      required: true,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    verifiedPurchase: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

ProductReviewSchema.index({ product: 1, customer: 1 }, { unique: true });
ProductReviewSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ProductReview', ProductReviewSchema);
