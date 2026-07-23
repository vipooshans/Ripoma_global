const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const CustomerAccount = require('../models/CustomerAccount');
const CustomerSession = require('../models/CustomerSession');
const StorefrontOrder = require('../models/StorefrontOrder');
const SupportTicket = require('../models/SupportTicket');
const CustomerNotification = require('../models/CustomerNotification');
const { sendAuthEmail } = require('../utils/authEmailService');
const {
  getCustomerJwtSecret,
  getCustomerRefreshSecret,
  getFrontendUrl,
  getGoogleClientId,
  isEmailVerificationRequired
} = require('../utils/customerAuthConfig');
const { validateCustomerPassword } = require('../utils/customerPasswordPolicy');
const { hashToken, createRawToken } = require('../utils/customerTokenHash');
const {
  PRIVACY_VERSION,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS
} = require('../config/storefrontLegal');
const { normalizePrefs } = require('../utils/customerNotifyService');

const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;
const REFRESH_DAYS = 7;

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
  privacyConsentAt: customer.privacyConsentAt,
  privacyConsentVersion: customer.privacyConsentVersion,
  hasPassword: Boolean(customer.password),
  hasGoogle: Boolean(customer.googleId),
  createdAt: customer.createdAt
});

const generateAccessToken = (customer) =>
  jwt.sign({ id: customer._id, type: 'customer' }, getCustomerJwtSecret(), {
    expiresIn: '15m'
  });

const generateRefreshToken = (customer, sessionId) =>
  jwt.sign(
    { id: customer._id, type: 'customer', sid: String(sessionId) },
    getCustomerRefreshSecret(),
    { expiresIn: `${REFRESH_DAYS}d` }
  );

// Cross-site (Pages → Workers) needs SameSite=None; Secure.
// Detect HTTPS via X-Forwarded-Proto so tunnel/proxy works with NODE_ENV=development.
const refreshCookieOptions = (req) => {
  const forwarded = String(req?.headers?.['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const crossSite =
    process.env.NODE_ENV === 'production' ||
    process.env.CROSS_SITE_COOKIES === 'true' ||
    forwarded === 'https' ||
    req?.secure === true;

  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? 'none' : 'strict',
    path: '/',
    maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000
  };
};

const clearRefreshCookie = (res, req) => {
  const opts = refreshCookieOptions(req);
  res.clearCookie('customerRefreshToken', {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path || '/'
  });
};

const clientMeta = (req) => ({
  userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
  ip: String(req.ip || req.connection?.remoteAddress || '').slice(0, 100)
});

const createSessionAndSetCookie = async (res, customer, req) => {
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
  const meta = clientMeta(req);
  const session = await CustomerSession.create({
    customerAccount: customer._id,
    refreshTokenHash: 'pending',
    userAgent: meta.userAgent,
    ip: meta.ip,
    lastActiveAt: new Date(),
    expiresAt
  });

  const refreshToken = generateRefreshToken(customer, session._id);
  session.refreshTokenHash = hashToken(refreshToken);
  await session.save();

  res.cookie('customerRefreshToken', refreshToken, refreshCookieOptions(req));
  return { accessToken: generateAccessToken(customer), session };
};

const revokeAllSessions = async (customerId) => {
  await CustomerSession.updateMany(
    { customerAccount: customerId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

const formatSession = (s, currentSid) => ({
  id: s._id,
  userAgent: s.userAgent || '',
  ip: s.ip || '',
  lastActiveAt: s.lastActiveAt,
  createdAt: s.createdAt,
  expiresAt: s.expiresAt,
  current: currentSid ? String(s._id) === String(currentSid) : false
});

const getCurrentSessionId = (req) => {
  const refreshToken = req.cookies?.customerRefreshToken;
  if (!refreshToken) return null;
  try {
    const decoded = jwt.verify(refreshToken, getCustomerRefreshSecret());
    return decoded.sid || null;
  } catch {
    return null;
  }
};

// ─── Public legal ─────────────────────────────────────────────────────────────

exports.getLegal = (_req, res) => {
  return res.status(200).json({
    privacyVersion: PRIVACY_VERSION,
    privacy: PRIVACY_SECTIONS,
    terms: TERMS_SECTIONS
  });
};

// ─── Register ─────────────────────────────────────────────────────────────────

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
      shippingAddress,
      acceptTerms,
      marketingOptIn
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: 'First name, last name, email, and password are required.'
      });
    }

    if (!acceptTerms) {
      return res.status(400).json({
        message: 'You must accept the Terms of Service and Privacy Policy.'
      });
    }

    const pw = validateCustomerPassword(password);
    if (!pw.ok) {
      return res.status(400).json({ message: pw.message });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await CustomerAccount.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const verificationRaw = createRawToken();
    const customer = new CustomerAccount({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      password,
      companyName: companyName?.trim(),
      companyDetails: companyDetails?.trim(),
      shippingAddress,
      emailVerificationToken: hashToken(verificationRaw),
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
      privacyConsentAt: new Date(),
      privacyConsentVersion: PRIVACY_VERSION,
      notificationPrefs: {
        orderUpdates: true,
        shipmentUpdates: true,
        paymentUpdates: true,
        reminders: true,
        marketing: Boolean(marketingOptIn),
        channels: { email: true, sms: false, inApp: true }
      }
    });

    await customer.save();

    const verifyUrl = `${getFrontendUrl()}/customer/verify-email/${verificationRaw}`;

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

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    const customer = await CustomerAccount.findOne({
      emailVerificationToken: hashToken(token),
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

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const genericMessage =
      'If that email is registered and unverified, we have sent a new verification link.';

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const customer = await CustomerAccount.findOne({ email: email.toLowerCase().trim() });

    if (!customer || customer.emailVerified || customer.deletedAt) {
      return res.status(200).json({ message: genericMessage });
    }

    const verificationRaw = createRawToken();
    customer.emailVerificationToken = hashToken(verificationRaw);
    customer.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await customer.save();

    const verifyUrl = `${getFrontendUrl()}/customer/verify-email/${verificationRaw}`;

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

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const customer = await CustomerAccount.findOne({ email: email.toLowerCase().trim() });
    if (!customer || customer.deletedAt) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!customer.password) {
      return res.status(401).json({
        code: 'GOOGLE_ONLY_ACCOUNT',
        message: 'This account uses Google Sign-In. Please continue with Google.'
      });
    }

    if (customer.lockUntil && customer.lockUntil > new Date()) {
      const mins = Math.ceil((customer.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account temporarily locked due to failed sign-in attempts. Try again in about ${mins} minute(s).`
      });
    }

    const isMatch = await customer.comparePassword(password);
    if (!isMatch) {
      customer.failedLoginAttempts = (customer.failedLoginAttempts || 0) + 1;
      if (customer.failedLoginAttempts >= MAX_FAILED_LOGINS) {
        customer.lockUntil = new Date(Date.now() + LOCK_MS);
        customer.failedLoginAttempts = 0;
      }
      await customer.save();
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (customer.status === 'suspended') {
      return res.status(403).json({
        message: 'Your account has been suspended. Please contact support.'
      });
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

    customer.failedLoginAttempts = 0;
    customer.lockUntil = null;
    customer.lastLogin = new Date();
    await customer.save();

    const { accessToken } = await createSessionAndSetCookie(res, customer, req);

    return res.status(200).json({
      accessToken,
      customer: toSafeCustomer(customer)
    });
  } catch (error) {
    console.error('Customer Login Error:', error);
    return res.status(500).json({ message: 'Internal server error during login.' });
  }
};

/** Decode JWT payload without verifying (diagnostics only). */
const peekIdTokenPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

exports.loginWithGoogle = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    const clientId = getGoogleClientId();
    if (!clientId) {
      return res.status(503).json({
        message: 'Google Sign-In is not configured on the server.',
        code: 'GOOGLE_NOT_CONFIGURED'
      });
    }

    const oauthClient = new OAuth2Client(clientId);
    let payload;
    try {
      const ticket = await oauthClient.verifyIdToken({
        idToken: credential,
        audience: clientId
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      const peeked = peekIdTokenPayload(credential);
      const tokenAud = peeked?.aud ?? null;
      const tokenIss = peeked?.iss ?? null;
      console.error('Google token verify failed:', verifyErr.message, {
        expectedAudience: clientId,
        tokenAud,
        tokenIss,
        tokenExp: peeked?.exp ?? null
      });
      const body = {
        message: 'Invalid Google credential.',
        code: 'GOOGLE_TOKEN_INVALID'
      };
      if (!isProd) {
        body.detail = verifyErr.message;
        body.expectedAudience = clientId;
        body.tokenAud = tokenAud;
        body.tokenIss = tokenIss;
      }
      return res.status(401).json(body);
    }

    const iss = payload?.iss;
    if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
      console.error('Google token unexpected issuer:', iss);
      return res.status(401).json({
        message: 'Invalid Google credential.',
        code: 'GOOGLE_TOKEN_INVALID'
      });
    }

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({
        message: 'Google account email is missing or not verified.',
        code: 'GOOGLE_EMAIL_UNVERIFIED'
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const firstName = (payload.given_name || payload.name || 'Customer').trim().slice(0, 80);
    const lastName = (payload.family_name || 'User').trim().slice(0, 80);

    let customer =
      (await CustomerAccount.findOne({ googleId })) ||
      (await CustomerAccount.findOne({ email }));

    if (customer?.deletedAt) {
      return res.status(401).json({ message: 'Invalid Google credential.' });
    }

    if (customer) {
      if (customer.status === 'suspended') {
        return res.status(403).json({
          message: 'Your account has been suspended. Please contact support.'
        });
      }
      if (customer.status === 'inactive') {
        return res.status(403).json({ message: 'Your account is currently inactive.' });
      }

      if (!customer.googleId) {
        customer.googleId = googleId;
      } else if (customer.googleId !== googleId) {
        return res.status(409).json({
          message: 'This email is already linked to a different Google account.'
        });
      }

      customer.emailVerified = true;
      customer.failedLoginAttempts = 0;
      customer.lockUntil = null;
      customer.lastLogin = new Date();
      if (!customer.privacyConsentAt) {
        customer.privacyConsentAt = new Date();
        customer.privacyConsentVersion = PRIVACY_VERSION;
      }
      await customer.save();
    } else {
      customer = new CustomerAccount({
        firstName,
        lastName,
        email,
        googleId,
        emailVerified: true,
        privacyConsentAt: new Date(),
        privacyConsentVersion: PRIVACY_VERSION,
        lastLogin: new Date(),
        notificationPrefs: {
          orderUpdates: true,
          shipmentUpdates: true,
          paymentUpdates: true,
          reminders: true,
          marketing: false,
          channels: { email: true, sms: false, inApp: true }
        }
      });
      await customer.save();
    }

    const { accessToken } = await createSessionAndSetCookie(res, customer, req);

    return res.status(200).json({
      accessToken,
      customer: toSafeCustomer(customer)
    });
  } catch (error) {
    console.error('Customer Google Login Error:', error);
    return res.status(500).json({ message: 'Internal server error during Google sign-in.' });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.customerRefreshToken;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, getCustomerRefreshSecret());
        if (decoded.sid) {
          await CustomerSession.findByIdAndUpdate(decoded.sid, {
            revokedAt: new Date()
          });
        }
      } catch {
        /* ignore */
      }
    }
    clearRefreshCookie(res, req);
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    clearRefreshCookie(res, req);
    return res.status(200).json({ message: 'Logged out successfully.' });
  }
};

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
      clearRefreshCookie(res, req);
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        code: isExpired ? 'CUSTOMER_TOKEN_EXPIRED' : undefined,
        message: 'Invalid or expired refresh token.'
      });
    }

    if (decoded.type !== 'customer' || !decoded.sid) {
      clearRefreshCookie(res, req);
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    const session = await CustomerSession.findById(decoded.sid);
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.refreshTokenHash !== hashToken(refreshToken)
    ) {
      clearRefreshCookie(res, req);
      return res.status(401).json({
        code: 'CUSTOMER_TOKEN_EXPIRED',
        message: 'Session is no longer valid. Please sign in again.'
      });
    }

    const customer = await CustomerAccount.findById(decoded.id);
    if (!customer || customer.deletedAt) {
      clearRefreshCookie(res, req);
      return res.status(401).json({ message: 'Customer not found.' });
    }

    if (customer.status === 'suspended') {
      clearRefreshCookie(res, req);
      return res.status(403).json({ message: 'Your account has been suspended.' });
    }

    if (customer.status !== 'active') {
      clearRefreshCookie(res, req);
      return res.status(401).json({ message: 'Customer account is inactive.' });
    }

    // Rotate refresh token
    const newRefresh = generateRefreshToken(customer, session._id);
    session.refreshTokenHash = hashToken(newRefresh);
    session.lastActiveAt = new Date();
    const meta = clientMeta(req);
    if (meta.userAgent) session.userAgent = meta.userAgent;
    if (meta.ip) session.ip = meta.ip;
    await session.save();

    res.cookie('customerRefreshToken', newRefresh, refreshCookieOptions(req));

    const accessToken = generateAccessToken(customer);
    return res.status(200).json({ authenticated: true, accessToken });
  } catch (error) {
    console.error('Customer Refresh Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const genericMessage = 'If that email is registered, we have sent a password reset link.';

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const customer = await CustomerAccount.findOne({
      email: email.toLowerCase().trim(),
      deletedAt: null
    });
    if (!customer) {
      return res.status(200).json({ message: genericMessage });
    }

    const resetRaw = createRawToken();
    customer.passwordResetToken = hashToken(resetRaw);
    customer.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    await customer.save();

    const resetUrl = `${getFrontendUrl()}/customer/reset-password/${resetRaw}`;

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

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    const pw = validateCustomerPassword(password);
    if (!pw.ok) {
      return res.status(400).json({ message: pw.message });
    }

    const customer = await CustomerAccount.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!customer) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    customer.password = password;
    customer.passwordResetToken = undefined;
    customer.passwordResetExpires = undefined;
    customer.failedLoginAttempts = 0;
    customer.lockUntil = null;
    await customer.save();

    await revokeAllSessions(customer._id);

    return res.status(200).json({
      message: 'Password has been reset successfully. You can now log in.'
    });
  } catch (error) {
    console.error('Customer Reset Password Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

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
    if (!customer || customer.deletedAt) {
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
            nextChannels.sms !== undefined ? Boolean(nextChannels.sms) : current.channels.sms,
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

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    const pw = validateCustomerPassword(newPassword);
    if (!pw.ok) {
      return res.status(400).json({ message: pw.message });
    }

    const customer = await CustomerAccount.findById(req.customerUser._id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    if (customer.password) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current and new password are required.' });
      }
      const isMatch = await customer.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect current password.' });
      }
    }

    customer.password = newPassword;
    await customer.save();

    await revokeAllSessions(customer._id);
    clearRefreshCookie(res, req);

    return res.status(200).json({
      message: 'Password updated successfully. Please sign in again.',
      requireReauth: true
    });
  } catch (error) {
    console.error('Customer Change Password Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.listSessions = async (req, res) => {
  try {
    const currentSid = getCurrentSessionId(req);
    const sessions = await CustomerSession.find({
      customerAccount: req.customerUser._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActiveAt: -1 });

    return res.status(200).json({
      sessions: sessions.map((s) => formatSession(s, currentSid))
    });
  } catch (error) {
    console.error('List Sessions Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.revokeSession = async (req, res) => {
  try {
    const session = await CustomerSession.findOne({
      _id: req.params.id,
      customerAccount: req.customerUser._id,
      revokedAt: null
    });
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    session.revokedAt = new Date();
    await session.save();

    const currentSid = getCurrentSessionId(req);
    if (currentSid && String(session._id) === String(currentSid)) {
      clearRefreshCookie(res, req);
      return res.status(200).json({ message: 'Current session revoked.', requireReauth: true });
    }

    return res.status(200).json({ message: 'Session revoked.' });
  } catch (error) {
    console.error('Revoke Session Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.logoutAllSessions = async (req, res) => {
  try {
    await revokeAllSessions(req.customerUser._id);
    clearRefreshCookie(res, req);
    return res.status(200).json({
      message: 'Signed out of all devices.',
      requireReauth: true
    });
  } catch (error) {
    console.error('Logout All Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.exportMyData = async (req, res) => {
  try {
    const customer = await CustomerAccount.findById(req.customerUser._id).lean();
    if (!customer) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    const [orders, tickets, notifications] = await Promise.all([
      StorefrontOrder.find({ customerAccount: customer._id }).sort({ createdAt: -1 }).lean(),
      SupportTicket.find({ customerAccount: customer._id }).sort({ createdAt: -1 }).lean(),
      CustomerNotification.find({ recipient: customer._id })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean()
    ]);

    const { password, emailVerificationToken, passwordResetToken, failedLoginAttempts, lockUntil, ...safe } =
      customer;

    return res.status(200).json({
      exportedAt: new Date().toISOString(),
      account: safe,
      orders,
      supportTickets: tickets,
      notifications
    });
  } catch (error) {
    console.error('Export My Data Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.deleteMyAccount = async (req, res) => {
  try {
    const { password, confirm } = req.body || {};
    if (confirm !== 'DELETE') {
      return res.status(400).json({
        message: 'Type DELETE to confirm account deletion.'
      });
    }

    const customer = await CustomerAccount.findById(req.customerUser._id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer account not found.' });
    }

    if (customer.password) {
      if (!password) {
        return res.status(400).json({ message: 'Password is required.' });
      }
      const isMatch = await customer.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect password.' });
      }
    } else if (!customer.googleId) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    customer.status = 'inactive';
    customer.deletedAt = new Date();
    customer.email = `deleted+${customer._id}@deleted.local`;
    customer.phone = '';
    customer.firstName = 'Deleted';
    customer.lastName = 'User';
    customer.companyName = '';
    customer.companyDetails = '';
    customer.googleId = undefined;
    customer.shippingAddress = undefined;
    customer.billingAddress = undefined;
    await customer.save();

    await revokeAllSessions(customer._id);
    clearRefreshCookie(res, req);

    return res.status(200).json({
      message: 'Your account has been deleted.',
      requireReauth: true
    });
  } catch (error) {
    console.error('Delete Account Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

exports.toSafeCustomer = toSafeCustomer;
