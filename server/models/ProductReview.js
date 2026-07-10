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
      trim: true
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved'
    }
  },
  { timestamps: true }
);

ProductReviewSchema.index({ product: 1, customer: 1 }, { unique: true });

module.exports = mongoose.model('ProductReview', ProductReviewSchema);
