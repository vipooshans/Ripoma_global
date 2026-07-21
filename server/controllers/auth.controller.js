const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'ripoma_access_secret_key_12345',
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'ripoma_refresh_secret_key_67890',
    { expiresIn: '7d' }
  );
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account is currently inactive.' });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set refresh token in httpOnly cookie (SameSite=None required for Pages ↔ Workers)
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        phone: user.phone,
        department: user.department,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
};

// POST /api/auth/refresh
exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token missing.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'ripoma_refresh_secret_key_67890');
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'User not authorized or inactive.' });
    }

    const accessToken = generateAccessToken(user);
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Refresh Token Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict'
  });
  return res.status(200).json({ message: 'Logged out successfully.' });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal user existence, return 200
      return res.status(200).json({ message: 'If that email exists in our system, we have sent a reset link.' });
    }

    // Generate crypto token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    // Log the link or try to mail it
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    console.log(`\n======================================================`);
    console.log(`[PASSWORD RESET LINK FOR ${email}]: ${resetUrl}`);
    console.log(`======================================================\n`);

    // In a real application, you'd use nodemailer to mail this link.
    // For local convenience, we will log it. We'll still do a mock nodemailer config.
    try {
      const transporter = nodemailer.createTransport({
        jsonTransport: true // mock json transport
      });
      await transporter.sendMail({
        from: '"RIPOMA GLOBAL" <noreply@ripomaglobal.com>',
        to: email,
        subject: 'Reset Password',
        text: `Reset link: ${resetUrl}`
      });
    } catch (e) {
      console.log('Mock nodemailer failed but logged to console.');
    }

    return res.status(200).json({ message: 'If that email exists in our system, we have sent a reset link.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token is invalid or has expired.' });
    }

    user.password = password; // bcrypt pre-save hook handles hashing
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    return res.status(200).json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status,
        avatar: req.user.avatar,
        phone: req.user.phone,
        department: req.user.department,
        permissions: req.user.permissions
      }
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    // We must fetch the user WITH the password field included, since it's deselected by default or excluded in authMiddleware
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    user.password = newPassword; // Automatically hashed pre-save
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

