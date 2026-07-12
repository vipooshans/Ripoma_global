const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ShippingAddressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true }
  },
  { _id: false }
);

const CustomerAccountSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    // Optional company details
    companyName: {
      type: String,
      trim: true
    },
    companyDetails: {
      type: String,
      trim: true
    },
    // Shipping address
    shippingAddress: ShippingAddressSchema,
    // Billing address
    billingAddress: ShippingAddressSchema,
    // Customer notification preferences
    notificationPrefs: {
      orderUpdates: { type: Boolean, default: true },
      shipmentUpdates: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      channels: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true }
      }
    },
    // Account status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    // Email verification
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String
    },
    emailVerificationExpires: {
      type: Date
    },
    // Password reset
    passwordResetToken: {
      type: String
    },
    passwordResetExpires: {
      type: Date
    },
    // Optional link to existing Customer company record
    linkedCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
CustomerAccountSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password helper
CustomerAccountSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Full name virtual
CustomerAccountSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

CustomerAccountSchema.index({ email: 1 });
CustomerAccountSchema.index({ status: 1 });

module.exports = mongoose.model('CustomerAccount', CustomerAccountSchema);
