const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const CustomerAccount = require('../models/CustomerAccount');
const { sendAuthEmail } = require('../utils/authEmailService');
const {
  getCustomerJwtSecret,
  getCustomerRefreshSecret,
  getFrontendUrl,
  isEmailVerificationRequired
} = require('../utils/customerAuthConfig');

// ─── Safe customer payload (never includes password/hash/tokens) ─────────────

const { normalizePrefs } = require('../utils/customerNotifyService');

const toSafeCustomer = (customer) => ({
  id: customer._id,
  firstName: customer.firstName,
  lastName: customer.lastName,
  email: customer.email,
  phone: customer.phone,
  companyName: customer.companyName,
  companyDetails: customer.companyDetails,
  shippingAddress: customer.shippingAddress,
  billingAddress: customer.billingAddress,
  notificationPrefs: normalizePrefs(customer.notificationPrefs),
  emailVerified: customer.emailVerified,
  status: customer.status,
  lastLogin: customer.lastLogin,
  createdAt: customer.createdAt
});

// ─── Token Helpers ────────────────────────────────────────────────────────────

const generateAccessToken = (customer) => {
  return jwt.sign(
    { id: customer._id, type: 'customer' },
    getCustomerJwtSecret(),
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (customer) => {
  return jwt.sign(
    { id: customer._id, type: 'customer' },
    getCustomerRefreshSecret(),
    { expiresIn: '7d' }
  );
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

// ─── POST /api/customer-auth/register ────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      companyName,
      companyDetails,
      shippingAddress
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'First name, last name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await CustomerAccount.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    const customer = new CustomerAccount({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      password,
      companyName: companyName?.trim(),
      companyDetails: companyDetails?.trim(),
      shippingAddress,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    await customer.save();

    const verifyUrl = `${getFrontendUrl()}/customer/verify-email/${verificationToken}`;

    await sendAuthEmail({
      to: normalizedEmail,
      subject: 'Verify your RIPOMA GLOBAL account',
      text: `Hello ${firstName.trim()},\n\nWelcome to RIPOMA GLOBAL! Please verify your email address by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not register, please ignore this email.`,
      html: `<p>Hello <strong>${firstName.trim()}</strong>,</p><p>Welcome to <strong>RIPOMA GLOBAL</strong>! Please verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`
    });

    return res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      email: customer.email
    });
  } catch (error) {
    console.error('Customer Register Error:', error);
    return res.status(500).json({ message: 'Internal server error during registration.' });
  }
};

// ─── GET /api/customer-auth/verify-email/:token ───────────────────────────────

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    const customer = await CustomerAccount.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!customer) {
      return res.status(400).json({ message: 'Verification link is invalid or has expired.' });
    }

    customer.emailVerified = true;
    customer.emailVerificationToken = undefined;
    customer.emailVerificationExpires = undefined;
    await customer.save();

    return res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    console.error('Customer Email Verify Error:', error);
    return res.status(500).json({ message: 'Internal server error during email verification.' });
  }
};

// ─── POST /api/customer-auth/resend-verification ─────────────────────────────

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const genericMessage =
      'If that email is registered and unverified, we have sent a new verification link.';

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const customer = await CustomerAccount.findOne({ email: email.toLowerCase().trim() });

    if (!customer || customer.emailVerified) {
      return res.status(200).json({ message: genericMessage });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    customer.emailVerificationToken = verificationToken;
    customer.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await customer.save();

    const verifyUrl = `${getFrontendUrl()}/customer/verify-email/${verificationToken}`;

    await sendAuthEmail({
      to: customer.email,
      subject: 'Verify your RIPOMA GLOBAL account',
      text: `Hello ${customer.firstName},\n\nPlease verify your email address by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
      html: `<p>Hello <strong>${customer.firstName}</strong>,</p><p>Please verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`
    });

    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error('Customer Resend Verification Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─── POST /api/customer-auth/login ────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const customer = await CustomerAccount.findOne({ email: email.toLowerCase().trim() });
    if (!customer) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (customer.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    if (customer.status === 'inactive') {
      return res.status(403).json({ message: 'Your account is currently inactive.' });
    }

    if (isEmailVerificationRequired() && !customer.emailVerified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'Please verify your email address before logging in. Check your inbox for the verification link.'
      });
    }

    customer.lastLogin = new Date();
    await customer.save();

    const accessToken = generateAccessToken(customer);
    const refreshToken = generateRefreshToken(customer);

    res.cookie('customerRefreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      accessToken,
      customer: toSafeCustomer(customer)
    });
  } catch (error) {
    console.error('Customer Login Error:', error);
    return res.status(500).json({ message: 'Internal server error during login.' });
  }
};

// ─── POST /api/customer-auth/logout ───────────────────────────────────────────

exports.logout = (req, res) => {
  res.clearCookie('customerRefreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  return res.status(200).json({ message: 'Logged out successfully.' });
};

// ─── POST /api/customer-auth/refresh ──────────────────────────────────────────

// POST /api/customer-auth/refresh — missing cookie returns 200 { authenticated: false }
exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.customerRefreshToken;

    if (!refreshToken) {
      return res.status(200).json({ authenticated: false });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getCustomerRefreshSecret());
    } catch (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        code: isExpired ? 'CUSTOMER_TOKEN_EXPIRED' : undefined,
        message: 'Invalid or expired refresh token.'
      });
    }

    if (decoded.type !== 'customer') {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    const customer = await CustomerAccount.findById(decoded.id);
    if (!customer) {
      return res.status(401).json({ message: 'Customer not found.' });
    }

    if (customer.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended.' });
    }

    if (customer.status === 'inactive' || customer.status !== 'active') {
      return res.status(401).json({ message: 'Customer account is inactive.' });
    }

    const accessToken = generateAccessToken(customer);
    return res.status(200).json({ authenticated: true, accessToken });
  } catch (error) {
    console.error('Customer Refresh Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─── POST /api/customer-auth/forgot-password ─────────────────────────────────

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const genericMessage = 'If that email is registered, we have sent a password reset link.';

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const customer = await CustomerAccount.findOne({ email: email.toLowerCase().trim() });
    if (!customer) {
      return res.status(200).json({ message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    customer.passwordResetToken = resetToken;
    customer.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await customer.save();

    const resetUrl = `${getFrontendUrl()}/customer/reset-password/${resetToken}`;

    await sendAuthEmail({
      to: customer.email,
      subject: 'Reset your RIPOMA GLOBAL password',
      text: `Hello ${customer.firstName},\n\nYou requested a password reset. Visit the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you did not request this, please ignore this email.`,
      html: `<p>Hello <strong>${customer.firstName}</strong>,</p><p>Reset your password by visiting:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`
    });

    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error('Customer Forgot Password Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─── POST /api/customer-auth/reset-password ───────────────────────────────────

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const customer = await CustomerAccount.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!customer) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    customer.password = password;
    customer.passwordResetToken = undefined;
    customer.passwordResetExpires = undefined;
    await customer.save();

    return res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Customer Reset Password Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─── GET /api/customer-auth/me ────────────────────────────────────────────────

exports.getMe = async (req, res) => {
  try {
    if (!req.customerUser) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    return res.status(200).json({ customer: toSafeCustomer(req.customerUser) });
  } catch (error) {
    console.error('Customer Get Me Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─── PUT /api/customer-auth/me ────────────────────────────────────────────────

exports.updateMe = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      companyName,
      companyDetails,
      shippingAddress,
      billingAddress,
      notificationPrefs
    } = req.body;

    const customer = await CustomerAccount.findById(req.customerUser._id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    if (firstName !== undefined) customer.firstName = firstName.trim();
    if (lastName !== undefined) customer.lastName = lastName.trim();
    if (phone !== undefined) customer.phone = phone.trim();
    if (companyName !== undefined) customer.companyName = companyName.trim();
    if (companyDetails !== undefined) customer.companyDetails = companyDetails.trim();
    if (shippingAddress !== undefined) customer.shippingAddress = shippingAddress;
    if (billingAddress !== undefined) customer.billingAddress = billingAddress;
    if (notificationPrefs !== undefined) {
      const current = normalizePrefs(customer.notificationPrefs);
      const nextChannels = notificationPrefs.channels || {};
      customer.notificationPrefs = {
        orderUpdates:
          notificationPrefs.orderUpdates !== undefined
            ? Boolean(notificationPrefs.orderUpdates)
            : current.orderUpdates,
        shipmentUpdates:
          notificationPrefs.shipmentUpdates !== undefined
            ? Boolean(notificationPrefs.shipmentUpdates)
            : current.shipmentUpdates,
        paymentUpdates:
          notificationPrefs.paymentUpdates !== undefined
            ? Boolean(notificationPrefs.paymentUpdates)
            : current.paymentUpdates,
        reminders:
          notificationPrefs.reminders !== undefined
            ? Boolean(notificationPrefs.reminders)
            : current.reminders,
        marketing:
          notificationPrefs.marketing !== undefined
            ? Boolean(notificationPrefs.marketing)
            : current.marketing,
        channels: {
          email:
            nextChannels.email !== undefined
              ? Boolean(nextChannels.email)
              : current.channels.email,
          sms:
            nextChannels.sms !== undefined
              ? Boolean(nextChannels.sms)
              : current.channels.sms,
          inApp:
            nextChannels.inApp !== undefined
              ? Boolean(nextChannels.inApp)
              : current.channels.inApp
        }
      };
    }

    await customer.save();

    return res.status(200).json({
      message: 'Profile updated successfully.',
      customer: toSafeCustomer(customer)
    });
  } catch (error) {
    console.error('Customer Update Me Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ─── POST /api/customer-auth/change-password ─────────────────────────────────

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    const customer = await CustomerAccount.findById(req.customerUser._id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    const isMatch = await customer.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    customer.password = newPassword;
    await customer.save();

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Customer Change Password Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
